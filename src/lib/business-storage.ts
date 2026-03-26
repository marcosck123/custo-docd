"use client";

import type {
  CardInfo,
  EntryMeasure,
  Market,
  Platform,
  SaleRecord,
  StockEntryRecord,
  WalletData,
  WalletPocket,
  WalletTransaction,
} from "@/lib/types";

export const STORAGE_KEYS = {
  plataformas: "plataformas",
  mercados: "mercados",
  vendas: "vendas",
  entradas: "entradas",
  carteira: "carteira",
  cartaoInfo: "cartaoInfo",
} as const;

const defaultWallet: WalletData = {
  banco: 0,
  caixa: 0,
  transacoes: [],
};

const defaultCardInfo: CardInfo = {
  nomeNegocio: "Minha Empresa",
  responsavel: "",
  documento: "",
  telefone: "",
  observacoes: "",
};

function canUseStorage() {
  return typeof window !== "undefined";
}

export function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function formatCurrencyBRL(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function parseCurrencyInput(value: string) {
  const cleaned = value.trim().replace(/[^\d,.-]/g, "");
  if (!cleaned) return Number.NaN;

  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  const decimalIndex = Math.max(lastComma, lastDot);

  if (decimalIndex === -1) {
    return Number(cleaned.replace(/[^\d-]/g, ""));
  }

  const integerPart = cleaned.slice(0, decimalIndex).replace(/[^\d-]/g, "");
  const decimalPart = cleaned.slice(decimalIndex + 1).replace(/[^\d]/g, "");
  return Number(`${integerPart || "0"}.${decimalPart || "0"}`);
}

export function convertToBaseUnit(quantity: number, measure: EntryMeasure) {
  switch (measure) {
    case "KG":
      return { quantity: quantity * 1000, unit: "G" as const };
    case "L":
      return { quantity: quantity * 1000, unit: "ML" as const };
    default:
      return { quantity, unit: measure === "UN" ? "UN" as const : measure };
  }
}

function readJson<T>(key: string, fallback: T): T {
  if (!canUseStorage()) return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function getPlatforms() {
  return readJson<Platform[]>(STORAGE_KEYS.plataformas, []);
}

export function savePlatforms(platforms: Platform[]) {
  writeJson(STORAGE_KEYS.plataformas, platforms);
}

export function getMarkets() {
  return readJson<Market[]>(STORAGE_KEYS.mercados, []);
}

export function saveMarkets(markets: Market[]) {
  writeJson(STORAGE_KEYS.mercados, markets);
}

export function getSales() {
  return readJson<SaleRecord[]>(STORAGE_KEYS.vendas, []);
}

export function saveSales(sales: SaleRecord[]) {
  writeJson(STORAGE_KEYS.vendas, sales);
}

export function getEntries() {
  return readJson<StockEntryRecord[]>(STORAGE_KEYS.entradas, []);
}

export function saveEntries(entries: StockEntryRecord[]) {
  writeJson(STORAGE_KEYS.entradas, entries);
}

export function getWallet() {
  return readJson<WalletData>(STORAGE_KEYS.carteira, defaultWallet);
}

export function saveWallet(wallet: WalletData) {
  writeJson(STORAGE_KEYS.carteira, wallet);
}

export function getCardInfo() {
  return readJson<CardInfo>(STORAGE_KEYS.cartaoInfo, defaultCardInfo);
}

export function saveCardInfo(cardInfo: CardInfo) {
  writeJson(STORAGE_KEYS.cartaoInfo, cardInfo);
}

export function createWalletTransaction(input: Omit<WalletTransaction, "id" | "data"> & { data?: string }) {
  return {
    ...input,
    id: createId(),
    data: input.data ?? new Date().toISOString(),
  };
}

export function applyWalletTransaction(wallet: WalletData, transaction: WalletTransaction) {
  const balance = wallet[transaction.bolso];
  const nextBalance =
    transaction.tipo === "entrada" ? balance + transaction.valor : balance - transaction.valor;

  return {
    ...wallet,
    [transaction.bolso]: nextBalance,
    transacoes: [transaction, ...wallet.transacoes].slice(0, 100),
  };
}

export function registerWalletTransaction(transaction: WalletTransaction) {
  const wallet = getWallet();
  const nextWallet = applyWalletTransaction(wallet, transaction);
  saveWallet(nextWallet);
  return nextWallet;
}

export function getWalletTotal(wallet: WalletData) {
  return wallet.banco + wallet.caixa;
}

export function getPocketLabel(pocket: WalletPocket) {
  return pocket === "banco" ? "Banco" : "Caixa";
}
