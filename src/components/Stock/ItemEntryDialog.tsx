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
import type { EntryMeasure, Market, StockEntryRecord, StockItem } from "@/lib/types";
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
  const [selectedItemId, setSelectedItemId] = useState("__new__");
  const [newItemName, setNewItemName] = useState("");
  const [marketId, setMarketId] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [measure, setMeasure] = useState<"" | EntryMeasure>("");
  const [quantity, setQuantity] = useState("");
  const [category, setCategory] = useState<StockItem["categoria"]>("Ingrediente");
  const [markets, setMarkets] = useState<Market[]>([]);

  useEffect(() => {
    if (open) {
      setMarkets(getMarkets());
    }
  }, [open]);

  const sortedItems = useMemo(
    () => [...stockItems].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" })),
    [stockItems]
  );

  const selectedItem = useMemo(
    () => stockItems.find((item) => item.id === selectedItemId) ?? null,
    [stockItems, selectedItemId]
  );

  const resetForm = () => {
    setSelectedItemId("__new__");
    setNewItemName("");
    setMarketId("");
    setAmountPaid("");
    setMeasure("");
    setQuantity("");
    setCategory("Ingrediente");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!firestore) return;

    const market = markets.find((item) => item.id === marketId);
    const paid = parseCurrencyInput(amountPaid);
    const rawQuantity = measure ? parseCurrencyInput(quantity) : Number.NaN;
    const productName = selectedItem ? selectedItem.nome : newItemName.trim();

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

    const fallbackUnit = selectedItem?.unidade ?? "UN";
    const fallbackQuantity = selectedItem?.peso ?? 1;
    const normalized = measure ? convertToBaseUnit(rawQuantity, measure) : { quantity: fallbackQuantity, unit: fallbackUnit };

    if (selectedItem && selectedItem.unidade !== normalized.unit) {
      toast({
        title: "Unidade incompatível",
        description: `O item já está salvo em ${selectedItem.unidade}. Use uma medida compatível para a entrada.`,
        variant: "destructive",
      });
      return;
    }

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
      toast({
        title: "Entrada registrada",
        description: `${productName} recebeu uma nova entrada no estoque.`,
      });
      resetForm();
      onOpenChange(false);
    } catch {
      toast({
        title: "Falha ao registrar",
        description: "Não foi possível atualizar o estoque com a entrada informada.",
        variant: "destructive",
      });
    }
  };

  return (
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
            <Label>Produto</Label>
            <Select value={selectedItemId} onValueChange={setSelectedItemId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um item existente ou crie um novo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__new__">Novo produto</SelectItem>
                {sortedItems.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!selectedItem && (
            <>
              <div className="space-y-2">
                <Label htmlFor="new-stock-name">Nome do produto novo</Label>
                <Input
                  id="new-stock-name"
                  value={newItemName}
                  onChange={(event) => setNewItemName(event.target.value)}
                  placeholder="Ex: Frango"
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
            </>
          )}

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
            {!measure && selectedItem && (
              <p className="text-xs text-muted-foreground">
                Sem medida informada, a entrada reutiliza a unidade atual do item: {selectedItem.unidade}.
              </p>
            )}
          </div>

          {measure && (
            <div className="space-y-2">
              <Label htmlFor="entry-quantity">Quantidade</Label>
              <Input
                id="entry-quantity"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                placeholder="Ex: 2,5"
              />
            </div>
          )}

          <Button type="submit" className="w-full">
            Registrar Entrada
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
