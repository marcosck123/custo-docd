"use client";

import React, { useState, useEffect, useMemo, type ReactNode, createContext, useContext, useCallback } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import { collection, doc, Firestore, onSnapshot, query, setDoc, updateDoc } from 'firebase/firestore';
import type { WalletData, WalletTransaction, VendasPendentesApps, Platform, CardInfo } from '@/lib/types';
import { createId } from '@/lib/business-storage';

interface FirebaseServices {
    firebaseApp: FirebaseApp | null;
    auth: Auth | null;
    firestore: Firestore | null;
}

interface WalletContextType {
  walletData: WalletData | null;
  vendasPendentesApps: VendasPendentesApps | null;
  cardInfo: CardInfo | null;
  addTransaction: (transaction: Omit<WalletTransaction, 'id'>) => void;
  updateWalletBalance: (pocket: keyof WalletData, amount: number) => void;
  addPendingAppSale: (platform: Platform, saleValue: number) => void;
  clearPendingAppSales: (platformId: string) => void;
  updateCardInfo: (info: Partial<CardInfo>) => void;
  isLoadingWallet: boolean;
  isLoadingCardInfo: boolean;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

interface WalletProviderProps {
  children: ReactNode;
  firestore: Firestore | null;
}

const WalletProvider = ({ children, firestore }: WalletProviderProps) => {
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [vendasPendentesApps, setVendasPendentesApps] = useState<VendasPendentesApps | null>(null);
  const [cardInfo, setCardInfo] = useState<CardInfo | null>(null);
  const [isLoadingWallet, setIsLoadingWallet] = useState(true);
  const [isLoadingCardInfo, setIsLoadingCardInfo] = useState(true);

  const walletDocRef = useMemo(() => firestore ? doc(firestore, 'appConfig', 'wallet') : null, [firestore]);
  const pendingSalesDocRef = useMemo(() => firestore ? doc(firestore, 'appConfig', 'vendasPendentesApps') : null, [firestore]);
  const cardInfoDocRef = useMemo(() => firestore ? doc(firestore, 'appConfig', 'cardInfo') : null, [firestore]);

  // Load wallet data
  useEffect(() => {
    if (!walletDocRef) return;

    const unsubscribe = onSnapshot(walletDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setWalletData(docSnap.data() as WalletData);
      } else {
        // Initialize wallet if it doesn't exist
        setDoc(walletDocRef, { banco: 0, caixa: 0, transacoes: [] });
        setWalletData({ banco: 0, caixa: 0, transacoes: [] });
      }
      setIsLoadingWallet(false);
    }, (error) => {
      console.error("Error fetching wallet data:", error);
      setIsLoadingWallet(false);
    });

    return () => unsubscribe();
  }, [walletDocRef]);

  // Load pending app sales data
  useEffect(() => {
    if (!pendingSalesDocRef) return;

    const unsubscribe = onSnapshot(pendingSalesDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setVendasPendentesApps(docSnap.data() as VendasPendentesApps);
      } else {
        setDoc(pendingSalesDocRef, {}); // Initialize if it doesn't exist
        setVendasPendentesApps({});
      }
    }, (error) => {
      console.error("Error fetching pending app sales data:", error);
    });

    return () => unsubscribe();
  }, [pendingSalesDocRef]);

  // Load card info data
  useEffect(() => {
    if (!cardInfoDocRef) return;

    const unsubscribe = onSnapshot(cardInfoDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setCardInfo(docSnap.data() as CardInfo);
      } else {
        setDoc(cardInfoDocRef, { nomeNegocio: "Minha Empresa", responsavel: "", documento: "", telefone: "", observacoes: "" });
        setCardInfo({ nomeNegocio: "Minha Empresa", responsavel: "", documento: "", telefone: "", observacoes: "" });
      }
      setIsLoadingCardInfo(false);
    }, (error) => {
      console.error("Error fetching card info data:", error);
      setIsLoadingCardInfo(false);
    });

    return () => unsubscribe();
  }, [cardInfoDocRef]);

  const addTransaction = useCallback(async (transaction: Omit<WalletTransaction, 'id'>) => {
    if (!walletDocRef || !walletData) return;

    const newTransaction: WalletTransaction = { ...transaction, id: createId() };
    const updatedTransactions = [...walletData.transacoes, newTransaction];
    let newBanco = walletData.banco;
    let newCaixa = walletData.caixa;

    if (newTransaction.bolso === 'banco') {
      newBanco += (newTransaction.tipo === 'entrada' ? newTransaction.valor : -newTransaction.valor);
    } else {
      newCaixa += (newTransaction.tipo === 'entrada' ? newTransaction.valor : -newTransaction.valor);
    }

    await updateDoc(walletDocRef, {
      banco: newBanco,
      caixa: newCaixa,
      transacoes: updatedTransactions,
    });
  }, [walletDocRef, walletData]);

  const updateWalletBalance = useCallback(async (pocket: keyof WalletData, amount: number) => {
    if (!walletDocRef || !walletData) return;

    await updateDoc(walletDocRef, {
      [pocket]: walletData[pocket] + amount,
    });
  }, [walletDocRef, walletData]);

  const addPendingAppSale = useCallback(async (platform: Platform, saleValue: number) => {
    if (!pendingSalesDocRef || !vendasPendentesApps) return;

    const platformId = platform.id;
    const comissaoPercentual = platform.comissaoMensal || 0;
    const comissaoValor = (saleValue * comissaoPercentual) / 100;
    const liquido = saleValue - comissaoValor;

    const currentPending = vendasPendentesApps[platformId] || {
      totalBruto: 0,
      comissao: comissaoPercentual,
      totalComissao: 0,
      totalLiquido: 0,
      vendasIds: [],
    };

    const updatedPending = {
      ...currentPending,
      totalBruto: currentPending.totalBruto + saleValue,
      totalComissao: currentPending.totalComissao + comissaoValor,
      totalLiquido: currentPending.totalLiquido + liquido,
      vendasIds: [...currentPending.vendasIds, createId()], // Assuming each sale has a unique ID
    };

    await updateDoc(pendingSalesDocRef, {
      [platformId]: updatedPending,
    });
  }, [pendingSalesDocRef, vendasPendentesApps]);

  const updateCardInfo = useCallback(async (info: Partial<CardInfo>) => {
    if (!cardInfoDocRef) return;
    await updateDoc(cardInfoDocRef, info);
  }, [cardInfoDocRef]);

  const clearPendingAppSales = useCallback(async (platformId: string) => {
    if (!pendingSalesDocRef || !vendasPendentesApps) return;

    const updatedVendasPendentes = { ...vendasPendentesApps };
    delete updatedVendasPendentes[platformId];

    await setDoc(pendingSalesDocRef, updatedVendasPendentes);
  }, [pendingSalesDocRef, vendasPendentesApps]);

  const contextValue = useMemo(() => ({
    walletData,
    vendasPendentesApps,
    cardInfo,
    addTransaction,
    updateWalletBalance,
    addPendingAppSale,
    clearPendingAppSales,
    updateCardInfo,
    isLoadingWallet,
    isLoadingCardInfo,
  }), [walletData, vendasPendentesApps, cardInfo, addTransaction, updateWalletBalance, addPendingAppSale, clearPendingAppSales, updateCardInfo, isLoadingWallet, isLoadingCardInfo]);

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  );
};

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const [firebaseServices, setFirebaseServices] = useState<FirebaseServices>({
      firebaseApp: null,
      auth: null,
      firestore: null,
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
        setFirebaseServices(initializeFirebase());
    }
  }, []);

  return (
    <FirebaseProvider
      firebaseApp={firebaseServices.firebaseApp}
      auth={firebaseServices.auth}
      firestore={firebaseServices.firestore}
    >
      <WalletProvider firestore={firebaseServices.firestore}>
        {children}
      </WalletProvider>
    </FirebaseProvider>
  );
}
