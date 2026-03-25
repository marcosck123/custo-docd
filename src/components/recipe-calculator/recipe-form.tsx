"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PlusCircle, Save, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DialogClose, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { DoughRecipe, FillingRecipe, RecipeIngredient, StockItem } from "@/lib/types";

import { formatCurrency } from "./utils";

type RecipeFormProps = {
  recipeType: "dough" | "filling";
  onSave: (data: Omit<DoughRecipe | FillingRecipe, "id" | "dataCriacao">) => void;
  closeDialog: () => void;
  stockItems: StockItem[] | null;
  isLoadingStock: boolean;
  recipeToEdit?: DoughRecipe | FillingRecipe | null;
  selectContainer?: HTMLElement | null;
};

export function RecipeForm({
  recipeType,
  onSave,
  closeDialog,
  stockItems,
  isLoadingStock,
  recipeToEdit,
  selectContainer,
}: RecipeFormProps) {
  const { toast } = useToast();
  const [nome, setNome] = useState(recipeToEdit?.nome || "");
  const [rendimento, setRendimento] = useState(
    recipeToEdit && "rendimento" in recipeToEdit && recipeToEdit.rendimento
      ? String(recipeToEdit.rendimento)
      : ""
  );
  const [selectedStockItemId, setSelectedStockItemId] = useState("");
  const [quantidadeUsada, setQuantidadeUsada] = useState("");
  const [ingredientSearch, setIngredientSearch] = useState("");
  const [isIngredientSelectOpen, setIsIngredientSelectOpen] = useState(false);
  const ingredientSearchInputRef = useRef<HTMLInputElement | null>(null);

  const calculateIngredientCost = useCallback(
    (ingredient: RecipeIngredient) => {
      const stockItem = stockItems?.find((item) => item.id === ingredient.stockItemId);

      if (!stockItem || typeof stockItem.preco === "undefined" || !stockItem.peso || stockItem.peso <= 0) {
        return 0;
      }

      return (ingredient.quantidadeUsada / stockItem.peso) * stockItem.preco;
    },
    [stockItems]
  );

  const [ingredientes, setIngredientes] = useState<(RecipeIngredient & { custo?: number })[]>(
    () => recipeToEdit?.ingredientes.map((ingredient) => ({ ...ingredient, custo: calculateIngredientCost(ingredient) })) || []
  );

  const sortedStockItems = useMemo(() => {
    if (!stockItems) return [];

    return [...stockItems].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }));
  }, [stockItems]);

  const filteredStockItems = useMemo(() => {
    const normalizedSearch = ingredientSearch.trim().toLowerCase();

    if (!normalizedSearch) {
      return sortedStockItems;
    }

    return sortedStockItems.filter((item) => item.nome.toLowerCase().includes(normalizedSearch));
  }, [ingredientSearch, sortedStockItems]);

  useEffect(() => {
    setIngredientes((current) =>
      current.map((ingredient) => ({
        ...ingredient,
        custo: calculateIngredientCost(ingredient),
      }))
    );
  }, [calculateIngredientCost]);

  useEffect(() => {
    if (!isIngredientSelectOpen) return;

    const focusId = window.requestAnimationFrame(() => {
      ingredientSearchInputRef.current?.focus();
    });

    return () => window.cancelAnimationFrame(focusId);
  }, [isIngredientSelectOpen]);

  const handleAddIngredient = () => {
    const stockItem = stockItems?.find((item) => item.id === selectedStockItemId);
    const quantity = parseFloat(quantidadeUsada.replace(",", "."));

    if (!stockItem || !quantity || quantity <= 0) {
      toast({
        title: "Ingrediente inválido",
        description: "Selecione um item do estoque e insira uma quantidade válida.",
        variant: "destructive",
      });
      return;
    }

    const newIngredient: RecipeIngredient & { custo?: number } = {
      stockItemId: stockItem.id,
      nome: stockItem.nome,
      quantidadeUsada: quantity,
    };

    newIngredient.custo = calculateIngredientCost(newIngredient);

    setIngredientes([...ingredientes, newIngredient]);
    setSelectedStockItemId("");
    setQuantidadeUsada("");
    setIngredientSearch("");
  };

  const handleRemoveIngredient = (index: number) => {
    setIngredientes(ingredientes.filter((_, currentIndex) => currentIndex !== index));
  };

  const custoTotal = useMemo(
    () => ingredientes.reduce((total, ingredient) => total + (ingredient.custo || 0), 0),
    [ingredientes]
  );

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!nome || ingredientes.length === 0) {
      toast({
        title: "Campos incompletos",
        description: "Preencha o nome da receita e adicione ao menos um ingrediente.",
        variant: "destructive",
      });
      return;
    }

    if (!rendimento || parseFloat(rendimento) <= 0) {
      toast({
        title: "Rendimento inválido",
        description: "Por favor, insira um rendimento válido para a receita.",
        variant: "destructive",
      });
      return;
    }

    onSave({
      nome,
      ingredientes: ingredientes.map(({ custo, ...ingredient }) => ingredient),
      custoTotal,
      rendimento: parseFloat(rendimento),
    });

    closeDialog();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-4">
      <div className="space-y-2">
        <Label htmlFor="recipe-name">Nome da Receita</Label>
        <Input
          id="recipe-name"
          value={nome}
          onChange={(event) => setNome(event.target.value)}
          placeholder={recipeType === "dough" ? "Ex: Massa de Brownie" : "Ex: Recheio de Ninho"}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="recipe-yield">Peso Final da Receita (g)</Label>
        <Input
          id="recipe-yield"
          type="number"
          value={rendimento}
          onChange={(event) => setRendimento(event.target.value)}
          placeholder="Ex: 1200"
        />
      </div>

      <Separator />

      <h4 className="text-md font-medium">Ingredientes</h4>
      <div className="space-y-4 rounded-md border p-4">
        {ingredientes.length > 0 && (
          <div className="space-y-2">
            {ingredientes.map((ingredient, index) => (
              <div
                key={`${ingredient.stockItemId}-${index}`}
                className="flex items-center justify-between gap-2 rounded-md bg-muted/50 p-2"
              >
                <div>
                  <p className="font-medium">{ingredient.nome}</p>
                  <p className="text-sm text-muted-foreground">
                    {ingredient.quantidadeUsada}g - {formatCurrency(ingredient.custo)}
                  </p>
                </div>
                <Button variant="ghost" size="icon" type="button" onClick={() => handleRemoveIngredient(index)}>
                  <XCircle className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-2">
            <Label>Item do Estoque</Label>
            <Select
              value={selectedStockItemId}
              onOpenChange={(open) => {
                setIsIngredientSelectOpen(open);
                if (!open) setIngredientSearch("");
              }}
              onValueChange={(value) => {
                setSelectedStockItemId(value);
                setIngredientSearch("");
              }}
              disabled={isLoadingStock || !stockItems?.length}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um ingrediente..." />
              </SelectTrigger>
              <SelectContent container={selectContainer ?? undefined}>
                {!isLoadingStock && !!stockItems?.length && (
                  <div className="sticky top-0 z-10 bg-popover p-1">
                    <Input
                      ref={ingredientSearchInputRef}
                      value={ingredientSearch}
                      onChange={(event) => setIngredientSearch(event.target.value)}
                      onPointerDown={(event) => event.stopPropagation()}
                      onKeyDown={(event) => event.stopPropagation()}
                      placeholder="Pesquisar ingrediente..."
                    />
                  </div>
                )}
                {isLoadingStock ? (
                  <SelectItem value="loading" disabled>
                    Carregando...
                  </SelectItem>
                ) : filteredStockItems.length ? (
                  filteredStockItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.nome}
                    </SelectItem>
                  ))
                ) : stockItems?.length ? (
                  <SelectItem value="empty-filtered" disabled>
                    Nenhum ingrediente encontrado.
                  </SelectItem>
                ) : (
                  <SelectItem value="empty" disabled>
                    Nenhum ingrediente disponível.
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="w-32 space-y-2">
            <Label>Qtd. Usada</Label>
            <Input
              value={quantidadeUsada}
              onChange={(event) => setQuantidadeUsada(event.target.value)}
              placeholder="Ex: 150"
            />
          </div>

          <Button type="button" onClick={handleAddIngredient}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Adicionar
          </Button>
        </div>
      </div>

      <Separator />

      <div className="text-right">
        <p className="text-muted-foreground">Custo Total da Receita</p>
        <p className="text-2xl font-bold">{formatCurrency(custoTotal)}</p>
      </div>

      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">
            Cancelar
          </Button>
        </DialogClose>
        <Button type="submit">
          <Save className="mr-2 h-4 w-4" />
          Salvar Receita
        </Button>
      </DialogFooter>
    </form>
  );
}
