
import React, { useState, useEffect, useMemo, type ReactNode, createContext, useContext, useCallback } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import { collection, doc, Firestore, onSnapshot, query, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
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
  addTransaction: (transaction: Omit<WalletTransaction, 'id' | 'data'>) => Promise<void>;
  updateTransaction: (transactionId: string, updates: Partial<WalletTransaction>) => Promise<void>;
  deleteTransaction: (transactionId: string) => Promise<void>;
  updateWalletBalance: (pocket: keyof WalletData, amount: number) => Promise<void>;
  addPendingAppSale: (platform: Platform, saleValue: number) => Promise<void>;
  clearPendingAppSales: (platformId: string) => Promise<void>;
  updateCardInfo: (info: Partial<CardInfo>) => Promise<void>;
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
        const initialWallet = { banco: 0, caixa: 0, transacoes: [] };
        setDoc(walletDocRef, initialWallet);
        setWalletData(initialWallet);
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
        const initialCardInfo = { nomeNegocio: "Minha Empresa", responsavel: "", documento: "", telefone: "", observacoes: "" };
        setDoc(cardInfoDocRef, initialCardInfo);
        setCardInfo(initialCardInfo);
      }
      setIsLoadingCardInfo(false);
    }, (error) => {
      console.error("Error fetching card info data:", error);
      setIsLoadingCardInfo(false);
    });

    return () => unsubscribe();
  }, [cardInfoDocRef]);

  const addTransaction = useCallback(async (transaction: Omit<WalletTransaction, 'id' | 'data'>) => {
    if (!walletDocRef || !walletData) return;

    const newTransaction: WalletTransaction = { 
      ...transaction, 
      id: createId(),
      data: new Date().toISOString()
    };
    
    const updatedTransactions = [...walletData.transacoes, newTransaction];
    let newBanco = walletData.banco;
    let newCaixa = walletData.caixa;

    if (newTransaction.bolso === 'banco') {
      newBanco += (newTransaction.tipo === 'entrada' ? newTransaction.valor : -newTransaction.valor);
    } else {
      newCaixa += (newTransaction.tipo === 'entrada' ? newTransaction.valor : -newTransaction.valor);
    }

    try {
      await updateDoc(walletDocRef, {
        banco: newBanco,
        caixa: newCaixa,
        transacoes: updatedTransactions,
      });
    } catch (error) {
      console.error("Error adding transaction:", error);
      throw error;
    }
  }, [walletDocRef, walletData]);

  const updateTransaction = useCallback(async (transactionId: string, updates: Partial<WalletTransaction>) => {
    if (!walletDocRef || !walletData) return;

    const transactionIndex = walletData.transacoes.findIndex(t => t.id === transactionId);
    if (transactionIndex === -1) return;

    const oldTransaction = walletData.transacoes[transactionIndex];
    const updatedTransaction = { ...oldTransaction, ...updates };
    const updatedTransactions = [...walletData.transacoes];
    updatedTransactions[transactionIndex] = updatedTransaction;

    // Recalculate balances
    let newBanco = walletData.banco;
    let newCaixa = walletData.caixa;

    // Remove old transaction effect
    if (oldTransaction.bolso === 'banco') {
      newBanco -= (oldTransaction.tipo === 'entrada' ? oldTransaction.valor : -oldTransaction.valor);
    } else {
      newCaixa -= (oldTransaction.tipo === 'entrada' ? oldTransaction.valor : -oldTransaction.valor);
    }

    // Add new transaction effect
    if (updatedTransaction.bolso === 'banco') {
      newBanco += (updatedTransaction.tipo === 'entrada' ? updatedTransaction.valor : -updatedTransaction.valor);
    } else {
      newCaixa += (updatedTransaction.tipo === 'entrada' ? updatedTransaction.valor : -updatedTransaction.valor);
    }

    try {
      await updateDoc(walletDocRef, {
        banco: newBanco,
        caixa: newCaixa,
        transacoes: updatedTransactions,
      });
    } catch (error) {
      console.error("Error updating transaction:", error);
      throw error;
    }
  }, [walletDocRef, walletData]);

  const deleteTransaction = useCallback(async (transactionId: string) => {
    if (!walletDocRef || !walletData) return;

    const transaction = walletData.transacoes.find(t => t.id === transactionId);
    if (!transaction) return;

    const updatedTransactions = walletData.transacoes.filter(t => t.id !== transactionId);
    let newBanco = walletData.banco;
    let newCaixa = walletData.caixa;

    // Remove transaction effect
    if (transaction.bolso === 'banco') {
      newBanco -= (transaction.tipo === 'entrada' ? transaction.valor : -transaction.valor);
    } else {
      newCaixa -= (transaction.tipo === 'entrada' ? transaction.valor : -transaction.valor);
    }

    try {
      await updateDoc(walletDocRef, {
        banco: newBanco,
        caixa: newCaixa,
        transacoes: updatedTransactions,
      });
    } catch (error) {
      console.error("Error deleting transaction:", error);
      throw error;
    }
  }, [walletDocRef, walletData]);

  const updateWalletBalance = useCallback(async (pocket: keyof WalletData, amount: number) => {
    if (!walletDocRef || !walletData) return;

    try {
      await updateDoc(walletDocRef, {
        [pocket]: walletData[pocket] + amount,
      });
    } catch (error) {
      console.error("Error updating wallet balance:", error);
      throw error;
    }
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
      vendasIds: [...currentPending.vendasIds, createId()],
    };

    try {
      await updateDoc(pendingSalesDocRef, {
        [platformId]: updatedPending,
      });
    } catch (error) {
      console.error("Error adding pending app sale:", error);
      throw error;
    }
  }, [pendingSalesDocRef, vendasPendentesApps]);

  const updateCardInfo = useCallback(async (info: Partial<CardInfo>) => {
    if (!cardInfoDocRef) return;
    try {
      await updateDoc(cardInfoDocRef, info);
    } catch (error) {
      console.error("Error updating card info:", error);
      throw error;
    }
  }, [cardInfoDocRef]);

  const clearPendingAppSales = useCallback(async (platformId: string) => {
    if (!pendingSalesDocRef || !vendasPendentesApps) return;

    const updatedVendasPendentes = { ...vendasPendentesApps };
    delete updatedVendasPendentes[platformId];

    try {
      await setDoc(pendingSalesDocRef, updatedVendasPendentes);
    } catch (error) {
      console.error("Error clearing pending app sales:", error);
      throw error;
    }
  }, [pendingSalesDocRef, vendasPendentesApps]);

  const contextValue = useMemo(() => ({
    walletData,
    vendasPendentesApps,
    cardInfo,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    updateWalletBalance,
    addPendingAppSale,
    clearPendingAppSales,
    updateCardInfo,
    isLoadingWallet,
    isLoadingCardInfo,
  }), [walletData, vendasPendentesApps, cardInfo, addTransaction, updateTransaction, deleteTransaction, updateWalletBalance, addPendingAppSale, clearPendingAppSales, updateCardInfo, isLoadingWallet, isLoadingCardInfo]);

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  );
};

interface FirebaseClientProviderProps {
  children: ReactNode;
}

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
