"use client";

import { useEffect, useMemo, useState } from "react";
import { addDoc, collection, doc, serverTimestamp, updateDoc } from "firebase/firestore";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  convertToBaseUnit,
  createId,
  getEntries,
  getMarkets,
  parseCurrencyInput,
  saveEntries,
} from "@/lib/business-storage";
import { encontrarProdutosSimilares } from "@/lib/fuzzy-match";
import { SimilarProductModal } from "./SimilarProductModal";
import { useWallet } from "@/firebase/client-provider";
import type { EntryMeasure, Market, StockEntryRecord, StockItem, WalletPocket } from "@/lib/types";
import type { Firestore } from "firebase/firestore";

const entryMeasures: { value: EntryMeasure; label: string }[] = [
  { value: "KG", label: "kg" },
  { value: "G", label: "g" },
  { value: "ML", label: "ml" },
  { value: "L", label: "L" },
  { value: "UN", label: "Unidade" },
];

type ItemEntryDialogProps = {
  firestore: Firestore | null;
  stockItems: StockItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ItemEntryDialog({ firestore, stockItems, open, onOpenChange }: ItemEntryDialogProps) {
  const { toast } = useToast();
  const [newItemName, setNewItemName] = useState("");
  const [marketId, setMarketId] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [measure, setMeasure] = useState<"" | EntryMeasure>("");
  const [quantity, setQuantity] = useState("");
  const [category, setCategory] = useState<StockItem["categoria"]>("Ingrediente");
  const [markets, setMarkets] = useState<Market[]>([]);
  const [showSimilarModal, setShowSimilarModal] = useState(false);
  const [similarProducts, setSimilarProducts] = useState<StockItem[]>([]);
  const [selectedSimilarId, setSelectedSimilarId] = useState<string | null>(null);
  const [walletPocket, setWalletPocket] = useState<WalletPocket>("caixa");
  const { addTransaction } = useWallet();

  useEffect(() => {
    if (open) {
      setMarkets(getMarkets());
    }
  }, [open]);

  const resetForm = () => {
    setNewItemName("");
    setMarketId("");
    setAmountPaid("");
    setMeasure("");
    setQuantity("");
    setCategory("Ingrediente");
    setSimilarProducts([]);
    setSelectedSimilarId(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!firestore) return;

    const market = markets.find((item) => item.id === marketId);
    const paid = parseCurrencyInput(amountPaid);
    const rawQuantity = measure ? parseCurrencyInput(quantity) : Number.NaN;
    const productName = newItemName.trim();

    if (!productName || !market || Number.isNaN(paid) || paid <= 0) {
      toast({
        title: "Dados inválidos",
        description: "Informe produto, mercado e um valor pago válido.",
        variant: "destructive",
      });
      return;
    }

    if (measure && (Number.isNaN(rawQuantity) || rawQuantity <= 0)) {
      toast({
        title: "Quantidade inválida",
        description: "Informe uma quantidade compatível com a medida selecionada.",
        variant: "destructive",
      });
      return;
    }

    // Buscar produtos similares
    const similares = encontrarProdutosSimilares(productName, stockItems);

    if (similares.length > 0) {
      setSimilarProducts(similares);
      setShowSimilarModal(true);
      return;
    }

    // Se não houver similares, criar novo produto
    await salvarNovoOuAtualizar(null, productName, paid, rawQuantity, market, normalized);
  };

  const handleSelectSimilar = async (productId: string) => {
    const selectedItem = stockItems.find((item) => item.id === productId);
    if (!selectedItem || !firestore) return;

    const market = markets.find((item) => item.id === marketId);
    const paid = parseCurrencyInput(amountPaid);
    const rawQuantity = measure ? parseCurrencyInput(quantity) : Number.NaN;
    const normalized = measure ? convertToBaseUnit(rawQuantity, measure) : { quantity: selectedItem.peso, unit: selectedItem.unidade };

    await salvarNovoOuAtualizar(selectedItem, selectedItem.nome, paid, rawQuantity, market, normalized);
  };

  const handleCreateNew = async () => {
    if (!firestore) return;

    const market = markets.find((item) => item.id === marketId);
    const paid = parseCurrencyInput(amountPaid);
    const rawQuantity = measure ? parseCurrencyInput(quantity) : Number.NaN;
    const productName = newItemName.trim();
    const normalized = measure ? convertToBaseUnit(rawQuantity, measure) : { quantity: 1, unit: "UN" };

    await salvarNovoOuAtualizar(null, productName, paid, rawQuantity, market, normalized);
  };

  const salvarNovoOuAtualizar = async (
    selectedItem: StockItem | null,
    productName: string,
    paid: number,
    rawQuantity: number,
    market: Market | undefined,
    normalized: { quantity: number; unit: string }
  ) => {
    if (!firestore || !market) return;

    try {
      if (selectedItem) {
        await updateDoc(doc(firestore, "estoque", selectedItem.id), {
          preco: selectedItem.preco + paid,
          peso: selectedItem.peso + normalized.quantity,
          dataAtualizacao: serverTimestamp(),
        });
      } else {
        await addDoc(collection(firestore, "estoque"), {
          nome: productName,
          preco: paid,
          peso: normalized.quantity,
          unidade: normalized.unit,
          categoria: category,
          dataAtualizacao: serverTimestamp(),
        });
      }

      const newEntry: StockEntryRecord = {
        id: createId(),
        data: new Date().toISOString(),
        produto: productName,
        mercado: market.nome,
        valorPago: paid,
        medida: measure,
        quantidade: measure ? rawQuantity : null,
      };

      saveEntries([newEntry, ...getEntries()]);

      // Debitar da carteira
      addTransaction({
        id: createId(),
        tipo: "saida",
        categoria: "Compra de Insumo",
        descricao: `Compra de ${productName} em ${market.nome}`,
        valor: paid,
        bolso: walletPocket,
        data: new Date().toISOString(),
      });

      toast({
        title: selectedItem ? "Produto atualizado com sucesso" : "Novo produto adicionado",
        description: `${productName} foi ${selectedItem ? "atualizado" : "adicionado"} no estoque e o valor debitado da carteira.`,
      });
      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao registrar entrada e debitar da carteira:", error);
      toast({
        title: "Falha ao registrar",
        description: "Não foi possível atualizar o estoque e debitar da carteira.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogTrigger asChild>
          <Button size="sm" onClick={() => onOpenChange(true)}>
            Registrar Entrada de Item
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Entrada de Item</DialogTitle>
            <DialogDescription>Cadastre uma compra e atualize o estoque usando o checkout de entrada.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-stock-name">Nome do Produto</Label>
              <Input
                id="new-stock-name"
                value={newItemName}
                onChange={(event) => setNewItemName(event.target.value)}
                placeholder="Ex: Leite Condensado, Frango, etc."
              />
            </div>

            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={category} onValueChange={(value) => setCategory(value as StockItem["categoria"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ingrediente">Ingrediente</SelectItem>
                  <SelectItem value="Material">Material</SelectItem>
                  <SelectItem value="Consumo">Consumo</SelectItem>
                </SelectContent>
              </Select>
            </div>

          <div className="space-y-2">
            <Label>Mercado/Fornecedor</Label>
            <Select value={marketId} onValueChange={setMarketId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o mercado" />
              </SelectTrigger>
              <SelectContent>
                {markets.length ? (
                  markets.map((market) => (
                    <SelectItem key={market.id} value={market.id}>
                      {market.nome}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="empty-market" disabled>
                    Cadastre um mercado primeiro
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="entry-paid">Valor pago pelo produto (R$)</Label>
            <Input
              id="entry-paid"
              value={amountPaid}
              onChange={(event) => setAmountPaid(event.target.value)}
              placeholder="Ex: 25,90"
            />
          </div>

          <div className="space-y-2">
            <Label>Medida/Unidade</Label>
            <Select value={measure || "__none__"} onValueChange={(value) => setMeasure(value === "__none__" ? "" : (value as EntryMeasure))}>
              <SelectTrigger>
                <SelectValue placeholder="Opcional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sem medida informada</SelectItem>
                {entryMeasures.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Debitar de</Label>
            <Select value={walletPocket} onValueChange={(value: WalletPocket) => setWalletPocket(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o bolso" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="caixa">Caixa</SelectItem>
                <SelectItem value="banco">Banco</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {measure && (
            <div className="space-y-2">
              <Label htmlFor="entry-quantity">Quantidade / Peso</Label>
              <Input
                id="entry-quantity"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                placeholder="Ex: 2.5"
              />
            </div>
          )}

          <Button type="submit" className="w-full">
            Registrar Entrada
          </Button>
        </form>
      </DialogContent>
    </Dialog>

    <SimilarProductModal
      open={showSimilarModal}
      onOpenChange={setShowSimilarModal}
      similarProducts={similarProducts}
      onSelectProduct={handleSelectSimilar}
      onCreateNew={handleCreateNew}
    />
    </>
  );
}
