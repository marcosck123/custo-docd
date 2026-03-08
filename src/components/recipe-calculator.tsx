"use client";

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PlusCircle, Trash2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { RecipeHistory } from './recipe-history';

type Ingredient = {
  id: number;
  name: string;
  packagePrice: string;
  packageQuantity: string;
  usedQuantity: string;
};

export type Recipe = {
  id: string;
  name: string;
  producedUnits: string;
  ingredients: Omit<Ingredient, 'id'>[];
  totalCost: number;
  costPerUnit: number;
};

// Function to format numbers as BRL currency
const formatCurrency = (value: number) => {
  if (isNaN(value) || !isFinite(value)) {
    return "R$ 0,00";
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export function RecipeCalculator() {
  const { toast } = useToast();

  const [recipeName, setRecipeName] = useState('');
  const [producedUnits, setProducedUnits] = useState('');
  const [nextId, setNextId] = useState(2);
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { id: 1, name: '', packagePrice: '', packageQuantity: '', usedQuantity: '' },
  ]);

  const [savedRecipes, setSavedRecipes] = useState<Recipe[]>([]);
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);

  const [totalCost, setTotalCost] = useState(0);
  const [costPerUnit, setCostPerUnit] = useState(0);

  const [pulseTotal, setPulseTotal] = useState(false);
  const [pulseUnit, setPulseUnit] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('custo-doce-recipes');
      if (saved) {
        setSavedRecipes(JSON.parse(saved));
      }
    } catch (error) {
      console.error("Failed to load recipes from localStorage", error);
      toast({
        title: "Erro ao carregar receitas",
        description: "Não foi possível carregar as receitas salvas.",
        variant: "destructive",
      });
      setSavedRecipes([]);
    }
  }, [toast]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
        try {
            localStorage.setItem('custo-doce-recipes', JSON.stringify(savedRecipes));
        } catch (error) {
            console.error("Failed to save recipes to localStorage", error);
            toast({
                title: "Erro ao salvar receitas",
                description: "Não foi possível salvar as receitas no seu navegador.",
                variant: "destructive",
            });
        }
    }
  }, [savedRecipes, toast]);


  const calculateIngredientCost = (ingredient: Ingredient) => {
    const price = parseFloat(ingredient.packagePrice.replace(',', '.')) || 0;
    const totalQty = parseFloat(ingredient.packageQuantity.replace(',', '.')) || 0;
    const usedQty = parseFloat(ingredient.usedQuantity.replace(',', '.')) || 0;

    if (totalQty === 0 || price === 0 || usedQty === 0) {
      return 0;
    }

    return (usedQty / totalQty) * price;
  };

  const memoizedTotalCost = useMemo(() => {
    return ingredients.reduce((total, ing) => total + calculateIngredientCost(ing), 0);
  }, [ingredients]);

  const memoizedCostPerUnit = useMemo(() => {
    const units = parseFloat(producedUnits.replace(',', '.')) || 0;
    if (units === 0 || memoizedTotalCost === 0) {
      return 0;
    }
    return memoizedTotalCost / units;
  }, [memoizedTotalCost, producedUnits]);
  
  useEffect(() => {
    if (memoizedTotalCost !== totalCost) {
      setTotalCost(memoizedTotalCost);
      setPulseTotal(true);
      const timer = setTimeout(() => setPulseTotal(false), 700);
      return () => clearTimeout(timer);
    }
  }, [memoizedTotalCost, totalCost]);

  useEffect(() => {
    if (memoizedCostPerUnit !== costPerUnit) {
      setCostPerUnit(memoizedCostPerUnit);
      setPulseUnit(true);
      const timer = setTimeout(() => setPulseUnit(false), 700);
      return () => clearTimeout(timer);
    }
  }, [memoizedCostPerUnit, costPerUnit]);


  const addIngredient = () => {
    if (ingredients.length >= 20) {
      toast({
        title: "Limite Atingido",
        description: "Você pode adicionar no máximo 20 ingredientes.",
        variant: "destructive",
      });
      return;
    }
    setIngredients([...ingredients, { id: nextId, name: '', packagePrice: '', packageQuantity: '', usedQuantity: '' }]);
    setNextId(prev => prev + 1);
  };

  const removeIngredient = (id: number) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter(ing => ing.id !== id));
    } else {
      toast({
        title: "Ação Inválida",
        description: "A receita deve ter pelo menos um ingrediente.",
      });
    }
  };

  const handleIngredientChange = (id: number, field: keyof Ingredient, value: string) => {
    setIngredients(ingredients.map(ing => (ing.id === id ? { ...ing, [field]: value } : ing)));
  };
  
  const handleClearForm = () => {
    setRecipeName('');
    setProducedUnits('');
    setIngredients([{ id: 1, name: '', packagePrice: '', packageQuantity: '', usedQuantity: '' }]);
    setNextId(2);
    setEditingRecipeId(null);
     toast({
        title: "Formulário Limpo",
        description: "Você está criando uma nova receita.",
    });
  };

  const handleSaveRecipe = () => {
    if (!recipeName.trim()) {
        toast({
            title: "Nome da Receita Faltando",
            description: "Por favor, dê um nome para sua receita antes de salvar.",
            variant: "destructive",
        });
        return;
    }

    const ingredientsToSave = ingredients.map(({ id, ...rest }) => rest);
    const hasAtLeastOneIngredient = ingredientsToSave.some(ing => ing.name.trim() !== '');
    if (!hasAtLeastOneIngredient) {
        toast({
            title: "Ingredientes Faltando",
            description: "Adicione pelo menos um ingrediente à sua receita.",
            variant: "destructive",
        });
        return;
    }

    if (editingRecipeId) {
      setSavedRecipes(prev => prev.map(recipe => 
        recipe.id === editingRecipeId 
        ? {
            ...recipe,
            name: recipeName,
            producedUnits,
            ingredients: ingredientsToSave,
            totalCost: memoizedTotalCost,
            costPerUnit: memoizedCostPerUnit,
          }
        : recipe
      ));
      toast({
        title: "Receita Atualizada!",
        description: `A receita "${recipeName}" foi atualizada com sucesso.`,
      });
    } else {
      const newRecipe: Recipe = {
        id: `${Date.now()}-${Math.random()}`,
        name: recipeName,
        producedUnits,
        ingredients: ingredientsToSave,
        totalCost: memoizedTotalCost,
        costPerUnit: memoizedCostPerUnit,
      };
      setSavedRecipes(prev => [newRecipe, ...prev]);
      toast({
          title: "Receita Salva!",
          description: `A receita "${recipeName}" foi salva com sucesso.`,
      });
    }

    handleClearForm();
  };

  const handleSelectRecipeToEdit = (recipe: Recipe) => {
    setRecipeName(recipe.name);
    setProducedUnits(recipe.producedUnits);
    let currentId = 1;
    const ingredientsWithId = recipe.ingredients.map(ing => ({...ing, id: currentId++}));
    setIngredients(ingredientsWithId.length > 0 ? ingredientsWithId : [{id: 1, name: '', packagePrice: '', packageQuantity: '', usedQuantity: ''}]);
    setNextId(currentId || 2);
    setEditingRecipeId(recipe.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast({
        title: "Editando Receita",
        description: `Você está editando a receita "${recipe.name}".`,
    });
  };

  const handleDeleteRecipe = (idToDelete: string) => {
    setSavedRecipes(prev => prev.filter(recipe => recipe.id !== idToDelete));
    if (editingRecipeId === idToDelete) {
        handleClearForm();
    }
    toast({
        title: "Receita Deletada",
        description: "A receita foi removida do seu histórico.",
    });
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <header className="text-center">
        <h1 className="text-4xl font-bold text-primary font-headline tracking-tight">Custo Doce</h1>
        <p className="text-muted-foreground mt-2">Sua calculadora de custo de receitas para confeitaria.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader>
            <CardTitle>{editingRecipeId ? `Editando: ${recipeName}` : 'Nova Receita'}</CardTitle>
            <CardDescription>
                {editingRecipeId 
                    ? "Altere os detalhes abaixo e clique em 'Atualizar Receita' para salvar." 
                    : "Preencha os detalhes da sua nova receita."}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="recipeName">Nome da Receita</Label>
              <Input
                id="recipeName"
                placeholder="Ex: Bolo de Chocolate"
                value={recipeName}
                onChange={(e) => setRecipeName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="producedUnits">Unidades Produzidas (Opcional)</Label>
              <Input
                id="producedUnits"
                type="text"
                inputMode="decimal"
                placeholder="Ex: 12"
                value={producedUnits}
                onChange={(e) => setProducedUnits(e.target.value.replace(/[^0-9,.]/g, ''))}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
            <CardHeader>
                <CardTitle>Custos Totais</CardTitle>
                <CardDescription>Resumo dos custos da receita.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-secondary/30 rounded-lg">
                    <span className="text-muted-foreground">Custo Total</span>
                    <span className={cn("text-2xl font-bold text-primary transition-transform duration-500", pulseTotal && "scale-110")}>
                        {formatCurrency(totalCost)}
                    </span>
                </div>
                <div className="flex justify-between items-center p-4 bg-secondary/30 rounded-lg">
                    <span className="text-muted-foreground">Custo/Unid.</span>
                    <span className={cn("text-2xl font-bold text-accent-foreground transition-transform duration-500", pulseUnit && "scale-110", (!producedUnits || parseFloat(producedUnits.replace(',', '.')) === 0) && "opacity-50")}>
                        {formatCurrency(costPerUnit)}
                    </span>
                </div>
            </CardContent>
            <CardFooter>
                 <Button onClick={handleSaveRecipe} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                    <Save className="mr-2 h-4 w-4" />
                    {editingRecipeId ? 'Atualizar Receita' : 'Salvar Receita'}
                </Button>
            </CardFooter>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
          <div className="space-y-1">
            <CardTitle>Ingredientes</CardTitle>
            <CardDescription>Adicione até 20 ingredientes para sua receita.</CardDescription>
          </div>
          <Button onClick={addIngredient} size="sm">
            <PlusCircle className="mr-2 h-4 w-4" />
            Adicionar Ingrediente
          </Button>
        </CardHeader>
        <CardContent>
          <div className="w-full overflow-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[30%] min-w-[150px]">Nome</TableHead>
                  <TableHead className="min-w-[120px]">Preço Pacote</TableHead>
                  <TableHead className="min-w-[150px]">Qtd. Pacote (g/ml)</TableHead>
                  <TableHead className="min-w-[150px]">Qtd. Usada (g/ml)</TableHead>
                  <TableHead className="text-right min-w-[100px]">Custo</TableHead>
                  <TableHead className="text-center w-[80px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ingredients.map((ing) => (
                  <TableRow key={ing.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">
                      <Input
                        placeholder="Farinha de trigo"
                        value={ing.name}
                        onChange={(e) => handleIngredientChange(ing.id, 'name', e.target.value)}
                        className="border-none bg-transparent p-0 h-auto focus-visible:ring-0"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="10,00"
                        value={ing.packagePrice}
                        onChange={(e) => handleIngredientChange(ing.id, 'packagePrice', e.target.value.replace(/[^0-9,.]/g, ''))}
                        className="text-right border-none bg-transparent p-0 h-auto focus-visible:ring-0"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="1000"
                        value={ing.packageQuantity}
                        onChange={(e) => handleIngredientChange(ing.id, 'packageQuantity', e.target.value.replace(/[^0-9,.]/g, ''))}
                        className="text-right border-none bg-transparent p-0 h-auto focus-visible:ring-0"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="200"
                        value={ing.usedQuantity}
                        onChange={(e) => handleIngredientChange(ing.id, 'usedQuantity', e.target.value.replace(/[^0-9,.]/g, ''))}
                        className="text-right border-none bg-transparent p-0 h-auto focus-visible:ring-0"
                      />
                    </TableCell>
                    <TableCell className="text-right font-medium text-primary">
                      {formatCurrency(calculateIngredientCost(ing))}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button variant="ghost" size="icon" onClick={() => removeIngredient(ing.id)} aria-label="Remover ingrediente">
                        <Trash2 className="h-4 w-4 text-destructive/80 hover:text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <RecipeHistory 
        recipes={savedRecipes} 
        onEdit={handleSelectRecipeToEdit} 
        onDelete={handleDeleteRecipe} 
        onNew={handleClearForm}
        currentEditingId={editingRecipeId}
      />

    </div>
  );
}
