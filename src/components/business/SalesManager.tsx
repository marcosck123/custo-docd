
import { useEffect, useMemo, useState } from "react";
import { collection } from "firebase/firestore";
import { Edit, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  createId,
  formatCurrencyBRL,
  getPlatforms,
  getSales,
  parseCurrencyInput,
  saveSales,
} from "@/lib/business-storage";
import { useWallet } from "@/firebase/client-provider";
import type { Platform, SaleRecord, StockItem, FinalProduct } from "@/lib/types";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export function SalesManager() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { addTransaction, addPendingAppSale } = useWallet();
  
  const stockQuery = useMemoFirebase(() => (firestore ? collection(firestore, "estoque") : null), [firestore]);
  const { data: stockItems } = useCollection<StockItem>(stockQuery);

  const productsQuery = useMemoFirebase(() => (firestore ? collection(firestore, "produtos_finais") : null), [firestore]);
  const { data: finalProducts } = useCollection<FinalProduct>(productsQuery);

  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [saleType, setSaleType] = useState<"stock" | "final">("stock");
  const [editingSale, setEditingSale] = useState<SaleRecord | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  // Stock sale
  const [produto, setProduto] = useState("");
  const [plataformaId, setPlataformaId] = useState("");
  const [precoVenda, setPrecoVenda] = useState("");

  // Final product sale
  const [produtoFinalId, setProdutoFinalId] = useState("");
  const [plataformaIdFinal, setPlataformaIdFinal] = useState("");
  const [precoVendaFinal, setPrecoVendaFinal] = useState("");

  useEffect(() => {
    setPlatforms(getPlatforms());
    setSales(getSales());
  }, []);

  const selectedPlatform = useMemo(
    () => platforms.find((platform) => platform.id === plataformaId) ?? null,
    [platforms, plataformaId]
  );

  const selectedPlatformFinal = useMemo(
    () => platforms.find((platform) => platform.id === plataformaIdFinal) ?? null,
    [platforms, plataformaIdFinal]
  );

  const selectedFinalProduct = useMemo(
    () => finalProducts?.find((p) => p.id === produtoFinalId) ?? null,
    [finalProducts, produtoFinalId]
  );

  const salePreview = useMemo(() => {
    const price = parseCurrencyInput(precoVenda);

    if (Number.isNaN(price) || price <= 0) return null;

    const tax = selectedPlatform?.cobraTaxa ? selectedPlatform.taxa : 0;
    const discount = price * (tax / 100);
    return {
      price,
      tax,
      discount,
      net: price - discount,
    };
  }, [precoVenda, selectedPlatform]);

  const salePreviewFinal = useMemo(() => {
    const price = parseCurrencyInput(precoVendaFinal);

    if (Number.isNaN(price) || price <= 0) return null;

    const tax = selectedPlatformFinal?.cobraTaxa ? selectedPlatformFinal.taxa : 0;
    const discount = price * (tax / 100);
    return {
      price,
      tax,
      discount,
      net: price - discount,
    };
  }, [precoVendaFinal, selectedPlatformFinal]);

  const sortedStock = useMemo(
    () => [...(stockItems ?? [])].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" })),
    [stockItems]
  );

  const sortedFinalProducts = useMemo(
    () => [...(finalProducts ?? [])].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" })),
    [finalProducts]
  );

  const sortedSales = useMemo(
    () => [...sales].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()),
    [sales]
  );

  const handleSubmitStock = (event: React.FormEvent) => {
    event.preventDefault();

    if (!produto || !selectedPlatform || !salePreview) {
      toast({
        title: "Campos incompletos",
        description: "Selecione produto, plataforma e informe um preço válido.",
        variant: "destructive",
      });
      return;
    }

    const newSale: SaleRecord = {
      id: createId(),
      data: new Date().toISOString(),
      produto,
      plataforma: selectedPlatform.nome,
      taxaAplicada: salePreview.tax,
      precoVenda: salePreview.price,
      valorFinal: salePreview.net,
    };

    const nextSales = [newSale, ...sales];
    setSales(nextSales);
    saveSales(nextSales);

    if (selectedPlatform.isApp) {
      addPendingAppSale(selectedPlatform, salePreview.price);
      toast({
        title: "Venda registrada",
        description: `A venda foi salva e o valor líquido será repassado pela ${selectedPlatform.nome}.`,
      });
    } else {
      addTransaction({
        tipo: "entrada",
        categoria: "Venda de Produto",
        descricao: `Venda - ${produto} - ${selectedPlatform.nome}`,
        valor: salePreview.net,
        bolso: "caixa",
      });
      toast({
        title: "Venda registrada",
        description: "A venda foi salva e o valor líquido entrou automaticamente na carteira.",
      });
    }

    setProduto("");
    setPlataformaId("");
    setPrecoVenda("");
  };

  const handleSubmitFinal = (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedFinalProduct || !selectedPlatformFinal || !salePreviewFinal) {
      toast({
        title: "Campos incompletos",
        description: "Selecione produto final, plataforma e informe um preço válido.",
        variant: "destructive",
      });
      return;
    }

    const newSale: SaleRecord = {
      id: createId(),
      data: new Date().toISOString(),
      produto: selectedFinalProduct.nome,
      plataforma: selectedPlatformFinal.nome,
      taxaAplicada: salePreviewFinal.tax,
      precoVenda: salePreviewFinal.price,
      valorFinal: salePreviewFinal.net,
    };

    const nextSales = [newSale, ...sales];
    setSales(nextSales);
    saveSales(nextSales);

    if (selectedPlatformFinal.isApp) {
      addPendingAppSale(selectedPlatformFinal, salePreviewFinal.price);
      toast({
        title: "Venda registrada",
        description: `A venda foi salva e o valor líquido será repassado pela ${selectedPlatformFinal.nome}.`,
      });
    } else {
      addTransaction({
        tipo: "entrada",
        categoria: "Venda de Produto",
        descricao: `Venda - ${selectedFinalProduct.nome} - ${selectedPlatformFinal.nome}`,
        valor: salePreviewFinal.net,
        bolso: "caixa",
      });
      toast({
        title: "Venda registrada",
        description: "A venda foi salva e o valor líquido entrou automaticamente na carteira.",
      });
    }

    setProdutoFinalId("");
    setPlataformaIdFinal("");
    setPrecoVendaFinal("");
  };

  const handleEditSale = (sale: SaleRecord) => {
    setEditingSale(sale);
    setIsEditDialogOpen(true);
  };

  const handleSaveEditedSale = () => {
    if (!editingSale) return;

    const updatedSales = sales.map(s => s.id === editingSale.id ? editingSale : s);
    setSales(updatedSales);
    saveSales(updatedSales);

    toast({
      title: "Venda atualizada",
      description: "A venda foi atualizada com sucesso.",
    });

    setIsEditDialogOpen(false);
    setEditingSale(null);
  };

  const handleDeleteSale = (saleId: string) => {
    const updatedSales = sales.filter(s => s.id !== saleId);
    setSales(updatedSales);
    saveSales(updatedSales);

    toast({
      title: "Venda deletada",
      description: "A venda foi removida do histórico.",
      variant: "destructive",
    });
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Registrar Venda</CardTitle>
          <CardDescription>Selecione o item, aplique a plataforma e confira o valor líquido antes de confirmar.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={saleType} onValueChange={(v) => setSaleType(v as "stock" | "final")} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="stock">Do Estoque</TabsTrigger>
              <TabsTrigger value="final">Produto Final</TabsTrigger>
            </TabsList>

            {/* Stock Sale */}
            <TabsContent value="stock" className="space-y-4">
              <form onSubmit={handleSubmitStock} className="space-y-4">
                <div className="space-y-2">
                  <Label>Produto</Label>
                  <Select value={produto} onValueChange={setProduto}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um produto do estoque" />
                    </SelectTrigger>
                    <SelectContent>
                      {sortedStock.length ? (
                        sortedStock.map((item) => (
                          <SelectItem key={item.id} value={item.nome}>
                            {item.nome}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="empty-stock" disabled>
                          Nenhum produto disponível
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Plataforma</Label>
                  <Select value={plataformaId} onValueChange={setPlataformaId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a plataforma" />
                    </SelectTrigger>
                    <SelectContent>
                      {platforms.length ? (
                        platforms.map((platform) => (
                          <SelectItem key={platform.id} value={platform.id}>
                            {platform.nome}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="empty-platform" disabled>
                          Cadastre uma plataforma primeiro
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sale-price">Preço de Venda (R$)</Label>
                  <Input
                    id="sale-price"
                    value={precoVenda}
                    onChange={(event) => setPrecoVenda(event.target.value)}
                    placeholder="Ex: 50,00"
                  />
                </div>

                {salePreview && (
                  <div className="rounded-2xl border bg-primary/5 p-4">
                    <p className="text-sm text-muted-foreground">Resumo da venda</p>
                    <div className="mt-3 space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span>Preço digitado</span>
                        <span>{formatCurrencyBRL(salePreview.price)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Taxa da plataforma</span>
                        <span>{salePreview.tax}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Desconto da taxa</span>
                        <span>{formatCurrencyBRL(salePreview.discount)}</span>
                      </div>
                      <div className="flex items-center justify-between border-t pt-2 text-base font-semibold text-primary">
                        <span>Valor final recebido</span>
                        <span>{formatCurrencyBRL(salePreview.net)}</span>
                      </div>
                    </div>
                  </div>
                )}

                <Button type="submit" className="w-full">
                  Registrar Venda
                </Button>
              </form>
            </TabsContent>

            {/* Final Product Sale */}
            <TabsContent value="final" className="space-y-4">
              <form onSubmit={handleSubmitFinal} className="space-y-4">
                <div className="space-y-2">
                  <Label>Produto Final</Label>
                  <Select value={produtoFinalId} onValueChange={setProdutoFinalId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um produto final" />
                    </SelectTrigger>
                    <SelectContent>
                      {sortedFinalProducts.length ? (
                        sortedFinalProducts.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.nome} - {formatCurrencyBRL(product.precoSugerido || 0)}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="empty-final" disabled>
                          Nenhum produto final disponível
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {selectedFinalProduct && (
                  <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
                    <p><strong>Custo:</strong> {formatCurrencyBRL(selectedFinalProduct.custoTotal)}</p>
                    <p><strong>Preço Sugerido:</strong> {formatCurrencyBRL(selectedFinalProduct.precoSugerido || 0)}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Plataforma</Label>
                  <Select value={plataformaIdFinal} onValueChange={setPlataformaIdFinal}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a plataforma" />
                    </SelectTrigger>
                    <SelectContent>
                      {platforms.length ? (
                        platforms.map((platform) => (
                          <SelectItem key={platform.id} value={platform.id}>
                            {platform.nome}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="empty-platform" disabled>
                          Cadastre uma plataforma primeiro
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sale-price-final">Preço de Venda (R$)</Label>
                  <Input
                    id="sale-price-final"
                    value={precoVendaFinal}
                    onChange={(event) => setPrecoVendaFinal(event.target.value)}
                    placeholder="Ex: 50,00"
                  />
                </div>

                {salePreviewFinal && (
                  <div className="rounded-2xl border bg-primary/5 p-4">
                    <p className="text-sm text-muted-foreground">Resumo da venda</p>
                    <div className="mt-3 space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span>Preço digitado</span>
                        <span>{formatCurrencyBRL(salePreviewFinal.price)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Taxa da plataforma</span>
                        <span>{salePreviewFinal.tax}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Desconto da taxa</span>
                        <span>{formatCurrencyBRL(salePreviewFinal.discount)}</span>
                      </div>
                      <div className="flex items-center justify-between border-t pt-2 text-base font-semibold text-primary">
                        <span>Valor final recebido</span>
                        <span>{formatCurrencyBRL(salePreviewFinal.net)}</span>
                      </div>
                    </div>
                  </div>
                )}

                <Button type="submit" className="w-full">
                  Registrar Venda
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Últimas Vendas</CardTitle>
          <CardDescription>Histórico salvo localmente para conferência rápida.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {sortedSales.length ? (
            sortedSales.slice(0, 8).map((sale) => (
              <div key={sale.id} className="rounded-2xl border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-medium">{sale.produto}</p>
                    <p className="text-sm text-muted-foreground">{sale.plataforma}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-primary text-right">{formatCurrencyBRL(sale.valorFinal)}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleEditSale(sale)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Deletar Venda</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja deletar esta venda? Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteSale(sale.id)}>
                            Deletar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Venda: {formatCurrencyBRL(sale.precoVenda)}</span>
                  <span>Taxa: {sale.taxaAplicada}%</span>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              Nenhuma venda registrada ainda.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Edição de Venda */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Venda</DialogTitle>
            <DialogDescription>Atualize os detalhes da venda.</DialogDescription>
          </DialogHeader>
          {editingSale && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Produto</Label>
                <Input
                  value={editingSale.produto}
                  onChange={(e) => setEditingSale({ ...editingSale, produto: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Plataforma</Label>
                <Input
                  value={editingSale.plataforma}
                  onChange={(e) => setEditingSale({ ...editingSale, plataforma: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Preço de Venda (R$)</Label>
                <Input
                  value={editingSale.precoVenda}
                  onChange={(e) => setEditingSale({ ...editingSale, precoVenda: parseFloat(e.target.value) || 0 })}
                  type="number"
                  step="0.01"
                />
              </div>
              <div className="space-y-2">
                <Label>Taxa (%)</Label>
                <Input
                  value={editingSale.taxaAplicada}
                  onChange={(e) => setEditingSale({ ...editingSale, taxaAplicada: parseFloat(e.target.value) || 0 })}
                  type="number"
                  step="0.01"
                />
              </div>
              <div className="space-y-2">
                <Label>Valor Final (R$)</Label>
                <Input
                  value={editingSale.valorFinal}
                  onChange={(e) => setEditingSale({ ...editingSale, valorFinal: parseFloat(e.target.value) || 0 })}
                  type="number"
                  step="0.01"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveEditedSale}>Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
