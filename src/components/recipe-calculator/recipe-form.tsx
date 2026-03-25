"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown, PlusCircle, Save, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { DialogClose, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import type { DoughRecipe, FillingRecipe, RecipeIngredient, StockItem } from "@/lib/types";
import { cn } from "@/lib/utils";

import { formatCurrency } from "./utils";

type RecipeFormProps = {
  recipeType: "dough" | "filling";
  onSave: (data: Omit<DoughRecipe | FillingRecipe, "id" | "dataCriacao">) => void;
  closeDialog: () => void;
  stockItems: StockItem[] | null;
  isLoadingStock: boolean;
  recipeToEdit?: DoughRecipe | FillingRecipe | null;
};

export function RecipeForm({
  recipeType,
  onSave,
  closeDialog,
  stockItems,
  isLoadingStock,
  recipeToEdit,
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
  const [isIngredientSelectOpen, setIsIngredientSelectOpen] = useState(false);

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

  useEffect(() => {
    setIngredientes((current) =>
      current.map((ingredient) => ({
        ...ingredient,
        custo: calculateIngredientCost(ingredient),
      }))
    );
  }, [calculateIngredientCost]);

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
            <Popover open={isIngredientSelectOpen} onOpenChange={setIsIngredientSelectOpen} modal>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={isIngredientSelectOpen}
                  className="w-full justify-between"
                  disabled={isLoadingStock || !stockItems?.length}
                >
                  {selectedStockItemId
                    ? stockItems?.find((item) => item.id === selectedStockItemId)?.nome
                    : "Selecione um ingrediente..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Pesquisar ingrediente..." />
                  <CommandList>
                    <CommandEmpty>
                      {stockItems?.length ? "Nenhum ingrediente encontrado." : "Nenhum ingrediente disponível."}
                    </CommandEmpty>
                    <CommandGroup>
                      {sortedStockItems.map((item) => (
                        <CommandItem
                          key={item.id}
                          value={`${item.nome} ${item.id}`}
                          onSelect={() => {
                            setSelectedStockItemId(item.id);
                            setIsIngredientSelectOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedStockItemId === item.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {item.nome}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
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
