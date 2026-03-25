"use client";

import React from "react";
import { collection, doc } from "firebase/firestore";
import { Trash2 } from "lucide-react";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import type { FinalProduct } from "@/lib/types";

import { formatCurrency } from "./utils";

export function SavedProductsManager() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const productsQuery = useMemoFirebase(() => (firestore ? collection(firestore, "produtos_finais") : null), [firestore]);
  const { data: products, isLoading } = useCollection<FinalProduct>(productsQuery);

  const handleDelete = (id: string) => {
    if (!firestore) return;

    deleteDocumentNonBlocking(doc(firestore, "produtos_finais", id));
    toast({ title: "Produto deletado!", variant: "destructive" });
  };

  return (
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
                <TableHead>Custo Total</TableHead>
                <TableHead>Qtd.</TableHead>
                <TableHead className="w-[80px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell colSpan={5}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : products && products.length > 0 ? (
                products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">
                      {product.nome}
                      {(product.materialPercentage || product.consumoPercentage) && (
                        <p className="text-xs text-muted-foreground">
                          (+{product.materialPercentage || 0}% mat, +{product.consumoPercentage || 0}% cons)
                        </p>
                      )}
                    </TableCell>
                    <TableCell>{formatCurrency(product.custoUnitario)}</TableCell>
                    <TableCell>{formatCurrency(product.custoTotal)}</TableCell>
                    <TableCell>{product.quantidadeFinal} unid.</TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive/80" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Essa ação não pode ser desfeita. Isso irá deletar permanentemente o produto "{product.nome}".
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(product.id)}>Deletar</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    Nenhum produto final salvo.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
