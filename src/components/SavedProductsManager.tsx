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
  if (value === null || value === undefined || isNaN(value) || !isFinite(value)) return "—";
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
                  <TableHead>Custo Unit.</TableHead>
                  <TableHead className="text-red-500">🔴 Mínimo</TableHead>
                  <TableHead className="text-primary">⭐ Ideal</TableHead>
                  <TableHead className="text-green-600">💰 Venda</TableHead>
                  <TableHead>Qtd.</TableHead>
                  <TableHead className="text-right w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-5 w-full" /></TableCell></TableRow>
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

                      {/* Preço Mínimo */}
                      <TableCell>
                        {product.precoMinimo ? (
                          <div>
                            <p className="font-medium text-red-500">{formatCurrency(product.precoMinimo)}</p>
                            {product.margemMinima && <p className="text-xs text-muted-foreground">{product.margemMinima}%</p>}
                          </div>
                        ) : product.precoVenda ? (
                          <span className="text-muted-foreground text-xs">{formatCurrency(product.precoVenda)}</span>
                        ) : <span className="text-muted-foreground text-xs">—</span>}
                      </TableCell>

                      {/* Preço Ideal */}
                      <TableCell>
                        {product.precoIdeal ? (
                          <div>
                            <p className="font-medium text-primary">{formatCurrency(product.precoIdeal)}</p>
                            {product.margemIdeal && <p className="text-xs text-muted-foreground">{product.margemIdeal}%</p>}
                          </div>
                        ) : <span className="text-muted-foreground text-xs">—</span>}
                      </TableCell>

                      {/* Preço de Venda */}
                      <TableCell>
                        {product.precoVenda || product.margemVenda ? (
                          <div>
                            <p className="font-medium text-green-600">{formatCurrency(product.precoVenda)}</p>
                            {product.margemVenda && <p className="text-xs text-muted-foreground">{product.margemVenda}%</p>}
                          </div>
                        ) : <span className="text-muted-foreground text-xs">—</span>}
                      </TableCell>

                      <TableCell>{product.quantidadeFinal} unid.</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setEditingProduct(product)}>
                            <Edit className="h-4 w-4" />
                          </Button>
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
                  <TableRow><TableCell colSpan={7} className="text-center h-24">Nenhum produto final salvo.</TableCell></TableRow>
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