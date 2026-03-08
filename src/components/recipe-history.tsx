"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, PlusCircle, FileClock } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import type { Recipe } from './recipe-calculator';
import { Skeleton } from "./ui/skeleton";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const formatCurrency = (value: number) => {
  if (isNaN(value) || !isFinite(value)) {
    return "R$ 0,00";
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const formatDate = (timestamp: any) => {
    if (timestamp && typeof timestamp.toDate === 'function') {
      return format(timestamp.toDate(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    }
    return 'Data indisponível';
};

type RecipeHistoryProps = {
  recipes: Recipe[];
  isLoading: boolean;
  onEdit: (recipe: Recipe) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
  currentEditingId: string | null;
};

export function RecipeHistory({ recipes, isLoading, onEdit, onDelete, onNew, currentEditingId }: RecipeHistoryProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
        <div className="space-y-1">
          <CardTitle>Histórico de Receitas</CardTitle>
          <CardDescription>Veja e gerencie suas receitas salvas na nuvem.</CardDescription>
        </div>
        <Button onClick={onNew} size="sm" variant="outline">
          <PlusCircle className="mr-2 h-4 w-4" />
          Nova Receita
        </Button>
      </CardHeader>
      <CardContent>
        <div className="w-full overflow-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome da Receita</TableHead>
                <TableHead>Data de Criação</TableHead>
                <TableHead className="text-right">Custo Total</TableHead>
                <TableHead className="text-right">Custo/Unid.</TableHead>
                <TableHead className="text-center w-[120px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                    <TableCell className="text-center"><Skeleton className="h-8 w-20 mx-auto" /></TableCell>
                  </TableRow>
                ))
              ) : recipes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground h-24">
                    <FileClock className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                    Nenhuma receita salva ainda.
                  </TableCell>
                </TableRow>
              ) : (
                recipes.sort((a, b) => (b.createdAt?.toDate?.() || 0) - (a.createdAt?.toDate?.() || 0)).map((recipe) => (
                  <TableRow key={recipe.id} data-state={currentEditingId === recipe.id ? "selected" : undefined}>
                    <TableCell className="font-medium">{recipe.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(recipe.createdAt)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(recipe.totalCost)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(recipe.costPerUnit)}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => onEdit(recipe)} aria-label="Editar receita">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label="Remover receita">
                               <Trash2 className="h-4 w-4 text-destructive/80 hover:text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Essa ação não pode ser desfeita. Isso irá deletar permanentemente a receita "{recipe.name}".
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => onDelete(recipe.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Deletar</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
