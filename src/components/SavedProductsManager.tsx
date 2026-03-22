"use client";
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Edit } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { FinalProduct } from '@/lib/types';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FinalProductManager } from './FinalProductManager';

const formatCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined || isNaN(value) || !isFinite(value)) return "R$ 0,00";
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export const SavedProductsManager = () => {
  const firestore = useFirestore();
  const { toast } = useToast();

  const [editingProduct, setEditingProduct] = useState<FinalProduct | null>(null);

  const productsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'produtos_finais') : null, [firestore]);
  const { data: products, isLoading } = useCollection<FinalProduct>(productsQuery);

  const handleDelete = (id: string) => {
    if (!firestore) return;
    deleteDocumentNonBlocking(doc(firestore, 'produtos_finais', id));
    toast({ title: "Produto deletado!", variant: "destructive" });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Produtos Finais Salvos</CardTitle>
          <CardDescription>Veja e gerencie seus produtos cadastrados.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full overflow-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome do Produto</TableHead>
                  <TableHead>Custo Unitário</TableHead>
                  <TableHead>Preço de Venda</TableHead>
                  <TableHead>Custo Total</TableHead>
                  <TableHead>Qtd.</TableHead>
                  <TableHead className="text-right w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-5 w-full" /></TableCell></TableRow>
                  ))
                ) : products && products.length > 0 ? (
                  products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">
                        {product.nome}
                        {(product.materialPercentage || product.consumoPercentage || product.maoDeObra) && (
                          <p className="text-xs text-muted-foreground">
                            {product.materialPercentage ? `+${product.materialPercentage}% mat ` : ''}
                            {product.consumoPercentage ? `+${product.consumoPercentage}% cons ` : ''}
                            {product.maoDeObra ? `+${formatCurrency(product.maoDeObra)} m.o.` : ''}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>{formatCurrency(product.custoUnitario)}</TableCell>
                      <TableCell>
                        {product.precoVenda
                          ? <span className="text-green-600 font-medium">{formatCurrency(product.precoVenda)}</span>
                          : <span className="text-muted-foreground text-xs">—</span>
                        }
                      </TableCell>
                      <TableCell>{formatCurrency(product.custoTotal)}</TableCell>
                      <TableCell>{product.quantidadeFinal} unid.</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Botão Editar */}
                          <Button variant="ghost" size="icon" onClick={() => setEditingProduct(product)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          {/* Botão Deletar */}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive/80" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                <AlertDialogDescription>Isso irá deletar permanentemente o produto "{product.nome}".</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(product.id)}>Deletar</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={6} className="text-center h-24">Nenhum produto final salvo.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Edição */}
      <Dialog open={!!editingProduct} onOpenChange={(open) => { if (!open) setEditingProduct(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Produto: {editingProduct?.nome}</DialogTitle>
          </DialogHeader>
          {editingProduct && (
            <FinalProductManager
              productToEdit={editingProduct}
              onSaved={() => setEditingProduct(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};