// src/components/Stock/StockManager.tsx
"use client";

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle, Trash2, Edit, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, serverTimestamp } from 'firebase/firestore';
import { addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { StockItem } from '@/lib/types';
import { StockItemForm } from './StockItemForm';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { CostAlertManager } from './CostAlertManager';

export function StockManager() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<StockItem | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  // Estado do alerta de impacto
  const [showCostAlert, setShowCostAlert] = useState(false);
  const [itemAtualizado, setItemAtualizado] = useState<{
    id: string; nomeAntigo: string; precoAntigo: number; precoNovo: number;
  } | null>(null);

  const stockQuery = useMemoFirebase(() => firestore ? collection(firestore, 'estoque') : null, [firestore]);
  const { data: stockItems, isLoading } = useCollection<StockItem>(stockQuery);

  const filteredStockItems = useMemo(() => {
    if (!stockItems) return [];
    const byCategory = activeCategory === 'all' ? stockItems : stockItems.filter(i => i.categoria === activeCategory);
    return byCategory.filter(i => i.nome.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [stockItems, searchTerm, activeCategory]);

  const handleSave = (itemData: Omit<StockItem, 'id' | 'dataAtualizacao'>) => {
    if (!firestore) return;
    const dataToSave = { ...itemData, dataAtualizacao: serverTimestamp() };

    if (editingItem) {
      // Verifica se o preço mudou para disparar alerta
      const precoMudou = editingItem.preco !== itemData.preco;

      updateDocumentNonBlocking(doc(firestore, 'estoque', editingItem.id), dataToSave);
      toast({ title: "Item atualizado!", description: `${itemData.nome} foi atualizado no estoque.` });

      // Dispara alerta de impacto se o preço mudou
      if (precoMudou) {
        setItemAtualizado({
          id: editingItem.id,
          nomeAntigo: editingItem.nome,
          precoAntigo: editingItem.preco,
          precoNovo: itemData.preco,
        });
        setShowCostAlert(true);
      }
    } else {
      addDocumentNonBlocking(collection(firestore, 'estoque'), dataToSave);
      toast({ title: "Item adicionado!", description: `${itemData.nome} foi adicionado ao estoque.` });
    }
    setEditingItem(undefined);
  };

  const handleDelete = (id: string) => {
    if (!firestore) return;
    deleteDocumentNonBlocking(doc(firestore, 'estoque', id));
    toast({ title: "Item deletado!", description: "O item foi removido do estoque." });
  };

  return (
    <>
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
          <div className="space-y-1">
            <CardTitle>Itens de Estoque</CardTitle>
            <CardDescription>Adicione, edite e remova os itens do seu inventário.</CardDescription>
          </div>
          <div className="flex gap-2">
            {/* Botão Recalcular Produtos */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setItemAtualizado(null); setShowCostAlert(true); }}
            >
              <RefreshCw className="mr-2 h-4 w-4" /> Recalcular Produtos
            </Button>

            {/* Botão Adicionar Item */}
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => { setEditingItem(undefined); setIsFormOpen(true); }} size="sm">
                  <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Item
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingItem ? 'Editar Item' : 'Adicionar Novo Item'}</DialogTitle>
                </DialogHeader>
                <StockItemForm
                  item={editingItem}
                  onSave={handleSave}
                  closeDialog={() => setIsFormOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs value={activeCategory} onValueChange={setActiveCategory}>
            <div className="flex justify-between items-center flex-wrap gap-4 py-4">
              <TabsList>
                <TabsTrigger value="all">Todos</TabsTrigger>
                <TabsTrigger value="Ingrediente">Ingredientes</TabsTrigger>
                <TabsTrigger value="Material">Materiais</TabsTrigger>
                <TabsTrigger value="Consumo">Consumos</TabsTrigger>
              </TabsList>
              <Input
                placeholder="Pesquisar no estoque..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <div className="w-full overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Preço</TableHead>
                    <TableHead>Peso/Qtd.</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Última Atualização</TableHead>
                    <TableHead className="text-center w-[120px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={7}><Skeleton className="h-5 w-full" /></TableCell>
                      </TableRow>
                    ))
                  ) : filteredStockItems.length > 0 ? (
                    filteredStockItems.sort((a, b) => a.nome.localeCompare(b.nome)).map(item => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.nome}</TableCell>
                        <TableCell>{formatCurrency(item.preco)}</TableCell>
                        <TableCell>{item.peso}</TableCell>
                        <TableCell>{item.unidade}</TableCell>
                        <TableCell>{item.categoria}</TableCell>
                        <TableCell>{formatDate(item.dataAtualizacao)}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button variant="ghost" size="icon" onClick={() => { setEditingItem(item); setIsFormOpen(true); }}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                              <Trash2 className="h-4 w-4 text-destructive/80 hover:text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground h-24">
                        {searchTerm ? "Nenhum item encontrado com esse nome." : "Nenhum item no estoque. Adicione um para começar."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Tabs>
        </CardContent>
      </Card>

      {/* Alerta de impacto nos produtos */}
      {showCostAlert && (
        <CostAlertManager
          stockItemAtualizado={itemAtualizado}
          onClose={() => { setShowCostAlert(false); setItemAtualizado(null); }}
        />
      )}
    </>
  );
}