"use client";

import React, { useState } from "react";
import { collection, doc, serverTimestamp } from "firebase/firestore";
import { Edit, PlusCircle, Trash2 } from "lucide-react";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import type { DoughRecipe, FillingRecipe, StockItem } from "@/lib/types";

import { RecipeForm } from "./recipe-form";
import { formatCurrency } from "./utils";

type RecipeManagerProps = {
  recipeType: "dough" | "filling";
  title: string;
  description: string;
  collectionName: string;
};

export function RecipeManager({ recipeType, title, description, collectionName }: RecipeManagerProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<DoughRecipe | FillingRecipe | null>(null);

  const recipesQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, collectionName) : null),
    [firestore, collectionName]
  );
  const { data: recipes, isLoading: isLoadingRecipes } = useCollection<DoughRecipe | FillingRecipe>(recipesQuery);

  const stockQuery = useMemoFirebase(() => (firestore ? collection(firestore, "estoque") : null), [firestore]);
  const { data: stockItems, isLoading: isLoadingStock } = useCollection<StockItem>(stockQuery);

  const handleSave = (recipeData: Omit<DoughRecipe | FillingRecipe, "id" | "dataCriacao">) => {
    if (!firestore) return;

    const dataToSave = { ...recipeData, dataCriacao: serverTimestamp() };

    if (editingRecipe) {
      updateDocumentNonBlocking(doc(firestore, collectionName, editingRecipe.id), dataToSave);
      toast({ title: "Receita atualizada!", description: `${recipeData.nome} foi atualizada.` });
    } else {
      addDocumentNonBlocking(collection(firestore, collectionName), dataToSave);
      toast({ title: "Receita salva!", description: `${recipeData.nome} foi salva.` });
    }

    setEditingRecipe(null);
  };

  const handleDelete = (id: string) => {
    if (!firestore) return;

    deleteDocumentNonBlocking(doc(firestore, collectionName, id));
    toast({ title: "Receita deletada!", variant: "destructive" });
  };

  const openFormForEdit = (recipe: DoughRecipe | FillingRecipe) => {
    setEditingRecipe(recipe);
    setIsFormOpen(true);
  };

  const openFormForNew = () => {
    setEditingRecipe(null);
    setIsFormOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button onClick={openFormForNew} size="sm">
                <PlusCircle className="mr-2 h-4 w-4" />
                Nova Receita
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingRecipe ? "Editar Receita" : `Nova Receita de ${title}`}</DialogTitle>
              </DialogHeader>
              <RecipeForm
                key={editingRecipe ? editingRecipe.id : "new-recipe"}
                recipeType={recipeType}
                onSave={handleSave}
                closeDialog={() => setIsFormOpen(false)}
                stockItems={stockItems}
                isLoadingStock={isLoadingStock}
                recipeToEdit={editingRecipe}
              />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        <div className="w-full overflow-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Custo Total</TableHead>
                <TableHead>Rendimento</TableHead>
                <TableHead>Custo / Unid.</TableHead>
                <TableHead className="w-[120px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingRecipes ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell colSpan={5}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : recipes && recipes.length > 0 ? (
                recipes.map((recipe) => (
                  <TableRow key={recipe.id}>
                    <TableCell className="font-medium">{recipe.nome}</TableCell>
                    <TableCell>{formatCurrency(recipe.custoTotal)}</TableCell>
                    <TableCell>{recipe.rendimento} unid.</TableCell>
                    <TableCell>{formatCurrency(recipe.custoTotal / recipe.rendimento)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openFormForEdit(recipe)}>
                          <Edit className="h-4 w-4" />
                        </Button>
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
                                Essa ação não pode ser desfeita. Isso irá deletar permanentemente a receita "{recipe.nome}".
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(recipe.id)}>Deletar</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    Nenhuma receita encontrada.
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
