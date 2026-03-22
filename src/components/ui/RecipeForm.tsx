"use client";
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Save, XCircle, Check, ChevronsUpDown } from 'lucide-react';
import { DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import type { StockItem, RecipeIngredient, DoughRecipe, FillingRecipe } from '@/lib/types';

const formatCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined || isNaN(value) || !isFinite(value)) return "R$ 0,00";
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export const RecipeForm = ({
  recipeType,
  onSave,
  closeDialog,
  stockItems,
  isLoadingStock,
  recipeToEdit,
}: {
  recipeType: 'dough' | 'filling';
  onSave: (data: any) => void;
  closeDialog: () => void;
  stockItems: StockItem[] | null;
  isLoadingStock: boolean;
  recipeToEdit?: DoughRecipe | FillingRecipe | null;
}) => {
  const { toast } = useToast();

  const calculateIngredientCost = useCallback((ing: RecipeIngredient) => {
    const stockItem = stockItems?.find(s => s.id === ing.stockItemId);
    if (!stockItem || typeof stockItem.preco === 'undefined' || !stockItem.peso || stockItem.peso <= 0) return 0;
    return (ing.quantidadeUsada / stockItem.peso) * stockItem.preco;
  }, [stockItems]);

  const [nome, setNome] = useState(recipeToEdit?.nome || '');
  const [rendimento, setRendimento] = useState(
    recipeToEdit && 'rendimento' in recipeToEdit && recipeToEdit.rendimento
      ? String(recipeToEdit.rendimento) : ''
  );
  const [ingredientes, setIngredientes] = useState<(RecipeIngredient & { custo?: number })[]>(
    () => recipeToEdit?.ingredientes.map(ing => ({ ...ing, custo: calculateIngredientCost(ing) })) || []
  );
  const [selectedStockItemId, setSelectedStockItemId] = useState('');
  const [quantidadeUsada, setQuantidadeUsada] = useState('');
  const [isComboboxOpen, setIsComboboxOpen] = useState(false);

  const sortedStockItems = useMemo(() => {
    if (!stockItems) return [];
    return [...stockItems].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }));
  }, [stockItems]);

  useEffect(() => {
    setIngredientes(ings => ings.map(ing => ({ ...ing, custo: calculateIngredientCost(ing) })));
  }, [calculateIngredientCost]);

  const handleAddIngredient = () => {
    const stockItem = stockItems?.find(item => item.id === selectedStockItemId);
    const quant = parseFloat(quantidadeUsada.replace(',', '.'));
    if (!stockItem || !quant || quant <= 0) {
      toast({ title: "Ingrediente inválido", description: "Selecione um item do estoque e insira uma quantidade válida.", variant: "destructive" });
      return;
    }
    const newIngredient: RecipeIngredient & { custo?: number } = {
      stockItemId: stockItem.id,
      nome: stockItem.nome,
      quantidadeUsada: quant,
    };
    newIngredient.custo = calculateIngredientCost(newIngredient);
    setIngredientes([...ingredientes, newIngredient]);
    setSelectedStockItemId('');
    setQuantidadeUsada('');
  };

  const handleRemoveIngredient = (index: number) => {
    setIngredientes(ingredientes.filter((_, i) => i !== index));
  };

  const custoTotal = useMemo(() => {
    return ingredientes.reduce((acc, ing) => acc + (ing.custo || 0), 0);
  }, [ingredientes]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || ingredientes.length === 0) {
      toast({ title: "Campos incompletos", description: "Preencha o nome da receita e adicione ao menos um ingrediente.", variant: "destructive" });
      return;
    }
    if (!rendimento || parseFloat(rendimento) <= 0) {
      toast({ title: "Rendimento inválido", description: "Por favor, insira um rendimento válido para a receita.", variant: "destructive" });
      return;
    }
    const recipeData: Omit<DoughRecipe | FillingRecipe, 'id' | 'dataCriacao'> = {
      nome,
      ingredientes: ingredientes.map(({ custo, ...ing }) => ing),
      custoTotal,
      rendimento: parseFloat(rendimento),
    };
    onSave(recipeData);
    closeDialog();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-4">
      <div className="space-y-2">
        <Label htmlFor="recipe-name">Nome da Receita</Label>
        <Input id="recipe-name" value={nome} onChange={(e) => setNome(e.target.value)}
          placeholder={recipeType === 'dough' ? "Ex: Massa de Brownie" : "Ex: Recheio de Ninho"} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="recipe-yield">Peso Final da Receita (g)</Label>
        <Input id="recipe-yield" type="number" value={rendimento} onChange={(e) => setRendimento(e.target.value)} placeholder="Ex: 1200" />
      </div>

      <Separator />
      <h4 className="font-medium text-md">Ingredientes</h4>

      <div className="p-4 border rounded-md space-y-4">
        {ingredientes.length > 0 && (
          <div className="space-y-2">
            {ingredientes.map((ing, index) => (
              <div key={index} className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/50">
                <div>
                  <p className="font-medium">{ing.nome}</p>
                  <p className="text-sm text-muted-foreground">{ing.quantidadeUsada}g - {formatCurrency(ing.custo)}</p>
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
            <Popover open={isComboboxOpen} onOpenChange={setIsComboboxOpen} modal>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={isComboboxOpen}
                  className="w-full justify-between" disabled={isLoadingStock || !stockItems?.length}>
                  {selectedStockItemId ? sortedStockItems.find((item) => item.id === selectedStockItemId)?.nome : "Selecione um ingrediente..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandInput placeholder="Pesquisar ingrediente..." />
                  <CommandList>
                    <CommandEmpty>Nenhum ingrediente encontrado.</CommandEmpty>
                    <CommandGroup>
                      {isLoadingStock ? (
                        <CommandItem disabled>Carregando...</CommandItem>
                      ) : sortedStockItems.length > 0 ? (
                        sortedStockItems.map((item) => (
                          <CommandItem key={item.id} value={item.nome} onSelect={() => { setSelectedStockItemId(item.id); setIsComboboxOpen(false); }}>
                            <Check className={cn("mr-2 h-4 w-4", selectedStockItemId === item.id ? "opacity-100" : "opacity-0")} />
                            {item.nome}
                          </CommandItem>
                        ))
                      ) : (
                        <CommandItem disabled>Nenhum item no estoque.</CommandItem>
                      )}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div className="w-32 space-y-2">
            <Label>Qtd. Usada</Label>
            <Input value={quantidadeUsada} onChange={(e) => setQuantidadeUsada(e.target.value)} placeholder="Ex: 150" />
          </div>
          <Button type="button" onClick={handleAddIngredient}><PlusCircle className="mr-2 h-4 w-4" />Adicionar</Button>
        </div>
      </div>

      <Separator />
      <div className="text-right">
        <p className="text-muted-foreground">Custo Total da Receita</p>
        <p className="text-2xl font-bold">{formatCurrency(custoTotal)}</p>
      </div>

      <DialogFooter>
        <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
        <Button type="submit"><Save className="mr-2 h-4 w-4" /> Salvar Receita</Button>
      </DialogFooter>
    </form>
  );
};
