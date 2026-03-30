"use client";

import { useState, useMemo, useEffect } from "react";
import { Edit, PlusCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, doc, serverTimestamp } from "firebase/firestore";
import { addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import type { FinalProduct } from "@/lib/types";
import { formatCurrency } from "@/lib/formatters";

interface SimpleFinalProductFormProps {
  product?: FinalProduct | null;
  onSave: (product: Omit<FinalProduct, "id" | "dataCriacao">) => void;
  onCancel: () => void;
  isEditing: boolean;
}

function SimpleFinalProductForm({ product, onSave, onCancel, isEditing }: SimpleFinalProductFormProps) {
  const { toast } = useToast();
  const [nome, setNome] = useState(product?.nome || "");
  const [custoIngredientes, setCustoIngredientes] = useState(product?.custoTotal?.toString() || "0");
  const [custoMaoDeObra, setCustoMaoDeObra] = useState(product?.custoMaoDeObra?.toString() || "0");
  const [lucroPercentual, setLucroPercentual] = useState(product?.lucroPercentual?.toString() || "30");

  const custoTotal = useMemo(() => {
    const ingredientes = parseFloat(custoIngredientes.replace(",", ".")) || 0;
    const maoDeObra = parseFloat(custoMaoDeObra.replace(",", ".")) || 0;
    return ingredientes + maoDeObra;
  }, [custoIngredientes, custoMaoDeObra]);

  const lucroValor = useMemo(() => {
    const lucro = parseFloat(lucroPercentual.replace(",", ".")) || 0;
    return (custoTotal * lucro) / 100;
  }, [custoTotal, lucroPercentual]);

  const precoSugerido = useMemo(() => {
    const lucro = parseFloat(lucroPercentual.replace(",", ".")) || 0;
    if (lucro >= 100 || custoTotal <= 0) return 0;
    if (lucro <= 0) return custoTotal;
    return custoTotal / (1 - lucro / 100);
  }, [custoTotal, lucroPercentual]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Informe o nome do produto.",
        variant: "destructive",
      });
      return;
    }

    const ingredientes = parseFloat(custoIngredientes.replace(",", ".")) || 0;
    const maoDeObra = parseFloat(custoMaoDeObra.replace(",", ".")) || 0;
    const lucro = parseFloat(lucroPercentual.replace(",", ".")) || 0;

    if (ingredientes < 0 || maoDeObra < 0 || lucro < 0) {
      toast({
        title: "Valores inválidos",
        description: "Os valores não podem ser negativos.",
        variant: "destructive",
      });
      return;
    }

    const productData: Omit<FinalProduct, "id" | "dataCriacao"> = {
      nome: nome.trim(),
      tipo: "produto_final",
      custoTotal,
      custoMaoDeObra: maoDeObra,
      lucroPercentual: lucro,
      precoSugerido,
      precoVenda: precoSugerido,
      // Campos obrigatórios do FinalProduct (compatibilidade)
      nomeMassa: "",
      nomeRecheio: null,
      quantidadeFinal: 1,
      custoUnitario: custoTotal,
    };

    onSave(productData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="product-name">Nome do Produto Final</Label>
        <Input
          id="product-name"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Ex: Bolo de Beijinho, Coxinha, Pizza"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="cost-ingredients">Custo Ingredientes (R$)</Label>
          <Input
            id="cost-ingredients"
            value={custoIngredientes}
            onChange={(e) => setCustoIngredientes(e.target.value)}
            placeholder="Ex: 20.00"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cost-labor">Custo Mão de Obra (R$)</Label>
          <Input
            id="cost-labor"
            value={custoMaoDeObra}
            onChange={(e) => setCustoMaoDeObra(e.target.value)}
            placeholder="Ex: 15.00"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="profit-margin">Lucro Desejado (%)</Label>
        <Input
          id="profit-margin"
          value={lucroPercentual}
          onChange={(e) => setLucroPercentual(e.target.value)}
          placeholder="Ex: 30"
        />
      </div>

      {/* Card de Resumo */}
      <div className="rounded-lg border bg-accent/50 p-4 space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">💰 Custo total:</span>
          <span className="text-sm font-semibold">{formatCurrency(custoTotal)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">📈 Lucro ({lucroPercentual}%):</span>
          <span className="text-sm font-semibold">{formatCurrency(lucroValor)}</span>
        </div>
        <div className="flex justify-between items-center pt-2 border-t">
          <span className="text-sm font-bold">🏷️ Preço sugerido:</span>
          <span className="text-lg font-bold text-primary">{formatCurrency(precoSugerido)}</span>
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">{isEditing ? "Atualizar Produto" : "Salvar Produto"}</Button>
      </DialogFooter>
    </form>
  );
}

export function SimpleFinalProductManager() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isOpen, setIsOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<FinalProduct | null>(null);

  const productsQuery = useMemoFirebase(
    () => firestore ? collection(firestore, "produtos_finais") : null,
    [firestore]
  );
  const { data: products, isLoading } = useCollection<FinalProduct>(productsQuery);

  const sortedProducts = useMemo(
    () => [...(products || [])].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" })),
    [products]
  );

  const handleSave = (productData: Omit<FinalProduct, "id" | "dataCriacao">) => {
    if (!firestore) return;

    if (editingProduct) {
      updateDocumentNonBlocking(doc(firestore, "produtos_finais", editingProduct.id), productData);
      toast({
        title: "Produto atualizado",
        description: `${productData.nome} foi atualizado com sucesso.`,
      });
    } else {
      addDocumentNonBlocking(collection(firestore, "produtos_finais"), {
        ...productData,
        dataCriacao: serverTimestamp(),
      });
      toast({
        title: "Produto criado",
        description: `${productData.nome} foi adicionado com sucesso.`,
      });
    }

    setIsOpen(false);
    setEditingProduct(null);
  };

  const handleDelete = (id: string) => {
    if (!firestore) return;
    deleteDocumentNonBlocking(doc(firestore, "produtos_finais", id));
    toast({
      title: "Produto removido",
      description: "O produto foi deletado com sucesso.",
    });
  };

  const openNew = () => {
    setEditingProduct(null);
    setIsOpen(true);
  };

  const openEdit = (product: FinalProduct) => {
    setEditingProduct(product);
    setIsOpen(true);
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div className="space-y-1">
          <CardTitle>Produtos Finais</CardTitle>
          <CardDescription>Cadastre seus produtos prontos para venda com custos e margem de lucro.</CardDescription>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openNew}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Novo Produto
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingProduct ? "Editar Produto Final" : "Novo Produto Final"}</DialogTitle>
            </DialogHeader>
            <SimpleFinalProductForm
              product={editingProduct}
              onSave={handleSave}
              onCancel={() => {
                setIsOpen(false);
                setEditingProduct(null);
              }}
              isEditing={!!editingProduct}
            />
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : sortedProducts.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sortedProducts.map((product) => (
              <div key={product.id} className="rounded-lg border bg-card p-4 space-y-3">
                <div className="space-y-1">
                  <h3 className="font-semibold">{product.nome}</h3>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div>Custo: {formatCurrency(product.custoTotal)}</div>
                    <div>Lucro: {product.lucroPercentual}%</div>
                    <div className="font-semibold text-primary">Preço: {formatCurrency(product.precoSugerido || product.precoVenda || 0)}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEdit(product)}
                    className="flex-1"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(product.id)}
                    className="flex-1 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Deletar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            Nenhum produto cadastrado ainda. Crie um novo para começar.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
