"use client";
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, Edit } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, serverTimestamp } from 'firebase/firestore';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { StockItem, DoughRecipe, FillingRecipe } from '@/lib/types';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { RecipeForm } from './RecipeForm';

const formatCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined || isNaN(value) || !isFinite(value)) return "R$ 0,00";
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export const RecipeManager = ({
  recipeType, title, description, collectionName
}: {
  recipeType: 'dough' | 'filling';
  title: string;
  description: string;
  collectionName: string;
}) => {
  const { toast } = useToast();
  const firestore = useFirestore();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<DoughRecipe | FillingRecipe | null>(null);

  const recipesQuery = useMemoFirebase(() => firestore ? collection(firestore, collectionName) : null, [firestore, collectionName]);
  const { data: recipes, isLoading: isLoadingRecipes } = useCollection<DoughRecipe | FillingRecipe>(recipesQuery);

  const stockQuery = useMemoFirebase(() => firestore ? collection(firestore, 'estoque') : null, [firestore]);
  const { data: stockItems, isLoading: isLoadingStock } = useCollection<StockItem>(stockQuery);

  const handleSave = (recipeData: Omit<DoughRecipe | FillingRecipe, 'id' | 'dataCriacao'>) => {
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

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingRecipe(null); setIsFormOpen(true); }} size="sm">
                <PlusCircle className="mr-2 h-4 w-4" />Nova Receita
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingRecipe ? `Editar Receita` : `Nova Receita de ${title}`}</DialogTitle>
              </DialogHeader>
              <RecipeForm
                key={editingRecipe ? editingRecipe.id : 'new-recipe'}
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
                <TableHead className="text-right w-[120px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingRecipes ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-5 w-full" /></TableCell></TableRow>
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
                        <Button variant="ghost" size="icon" onClick={() => { setEditingRecipe(recipe); setIsFormOpen(true); }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive/80" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                              <AlertDialogDescription>Isso irá deletar permanentemente a receita "{recipe.nome}".</AlertDialogDescription>
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
                <TableRow><TableCell colSpan={5} className="text-center h-24">Nenhuma receita encontrada.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
