"use client";
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, Edit, Save, XCircle, Check, ChevronsUpDown } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, serverTimestamp } from 'firebase/firestore';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { StockItem, RecipeIngredient, DoughRecipe, FillingRecipe, FinalProduct } from '@/lib/types';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command';
import { cn } from '@/lib/utils';

const formatCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined || isNaN(value) || !isFinite(value)) {
    return "R$ 0,00";
  }
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

// --- FORMULÁRIO DE RECEITA (MASSA/RECHEIO) ---
const RecipeForm = ({
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
      ? String(recipeToEdit.rendimento)
      : ''
  );

  const [ingredientes, setIngredientes] = useState<(RecipeIngredient & { custo?: number })[]>(
    () => recipeToEdit?.ingredientes.map(ing => ({...ing, custo: calculateIngredientCost(ing)})) || []
  );

  const [selectedStockItemId, setSelectedStockItemId] = useState('');
  const [quantidadeUsada, setQuantidadeUsada] = useState('');
  const [isComboboxOpen, setIsComboboxOpen] = useState(false);

  const sortedStockItems = useMemo(() => {
    if (!stockItems) return [];

    return [...stockItems].sort((a, b) =>
      a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })
    );
  }, [stockItems]);

  // Recalculate costs if stock item prices change
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
    if ((recipeType === 'dough' || recipeType === 'filling') && (!rendimento || parseFloat(rendimento) <= 0)) {
        toast({ title: "Rendimento inválido", description: "Por favor, insira um rendimento válido para a receita.", variant: "destructive" });
        return;
    }

    const recipeData: Omit<DoughRecipe | FillingRecipe, 'id' | 'dataCriacao'> = {
      nome,
      ingredientes: ingredientes.map(({ custo, ...ing }) => ing), // Remove temporary cost property
      custoTotal,
      rendimento: parseFloat(rendimento),
    };

    onSave(recipeData);
    closeDialog();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-4">
  {/* Adicione este bloco aqui para recuperar o nome */}
<div className="space-y-2">
  <Label htmlFor="recipe-name">Nome da Receita</Label>
  <Input 
    id="recipe-name" 
    value={nome} 
    onChange={(e) => setNome(e.target.value)} 
    placeholder={recipeType === 'dough' ? "Ex: Massa de Brownie" : "Ex: Recheio de Ninho"} 
  />
</div>

{/* O seu campo de Peso Final deve ficar logo abaixo dele */}
<div className="space-y-2">
  <Label htmlFor="recipe-yield">Peso Final da Receita (g)</Label>
  <Input 
    id="recipe-yield" 
    type="number" 
    value={rendimento} 
    onChange={(e) => setRendimento(e.target.value)} 
    placeholder="Ex: 1200" 
  />
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
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={isComboboxOpen}
                  className="w-full justify-between"
                  disabled={isLoadingStock || !stockItems?.length}
                >
                  {selectedStockItemId
                    ? sortedStockItems.find((item) => item.id === selectedStockItemId)?.nome
                    : "Selecione um ingrediente..."}
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
                          <CommandItem
                            key={item.id}
                            value={item.nome}
                            onSelect={() => {
                              setSelectedStockItemId(item.id);
                              setIsComboboxOpen(false);
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
          <Button type="button" onClick={handleAddIngredient}><PlusCircle className="mr-2 h-4 w-4"/>Adicionar</Button>
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
  )
}

// --- GERENCIADOR DE RECEITAS (MASSA/RECHEIO) ---
const RecipeManager = ({ recipeType, title, description, collectionName }: { recipeType: 'dough' | 'filling', title: string, description: string, collectionName: string }) => {
    const { toast } = useToast();
    const firestore = useFirestore();

    // State & Data
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingRecipe, setEditingRecipe] = useState<DoughRecipe | FillingRecipe | null>(null);

    const recipesQuery = useMemoFirebase(() => firestore ? collection(firestore, collectionName) : null, [firestore, collectionName]);
    const { data: recipes, isLoading: isLoadingRecipes } = useCollection<DoughRecipe | FillingRecipe>(recipesQuery);

    const stockQuery = useMemoFirebase(() => firestore ? collection(firestore, 'estoque') : null, [firestore]);
    const { data: stockItems, isLoading: isLoadingStock } = useCollection<StockItem>(stockQuery);

    // Handlers
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

    const openFormForEdit = (recipe: DoughRecipe | FillingRecipe) => {
        setEditingRecipe(recipe);
        setIsFormOpen(true);
    }

    const openFormForNew = () => {
        setEditingRecipe(null);
        setIsFormOpen(true);
    }

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
                            <Button onClick={openFormForNew} size="sm"><PlusCircle className="mr-2 h-4 w-4"/>Nova Receita</Button>
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
                                Array.from({length: 3}).map((_, i) => (
                                    <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-5 w-full"/></TableCell></TableRow>
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
                                                <Button variant="ghost" size="icon" onClick={() => openFormForEdit(recipe)}><Edit className="h-4 w-4" /></Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive/80" /></Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                                            <AlertDialogDescription>Essa ação não pode ser desfeita. Isso irá deletar permanentemente a receita "{recipe.nome}".</AlertDialogDescription>
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


// --- GERENCIADOR DE PRODUTO FINAL ---
// Substitua o componente FinalProductManager inteiro por este código

const FinalProductManager = () => {
    const { toast } = useToast();
    const firestore = useFirestore();

    // Data
    const doughRecipesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'receitas_massa') : null, [firestore]);
    const { data: doughRecipes, isLoading: isLoadingDough } = useCollection<DoughRecipe>(doughRecipesQuery);

    const fillingRecipesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'receitas_recheio') : null, [firestore]);
    const { data: fillingRecipes, isLoading: isLoadingFilling } = useCollection<FillingRecipe>(fillingRecipesQuery);

    // Form State
    const [nome, setNome] = useState('');

    // Multi-select: array de { id, gramas }
    const [selectedMassas, setSelectedMassas] = useState<{ id: string; gramas: string }[]>([]);
    const [selectedRecheios, setSelectedRecheios] = useState<{ id: string; gramas: string }[]>([]);

    const [quantidadeFinal, setQuantidadeFinal] = useState('1');
    const [materialPercentage, setMaterialPercentage] = useState('0');
    const [consumoPercentage, setConsumoPercentage] = useState('0');

    // --- Handlers Multi-select Massa ---
    const toggleMassa = (id: string) => {
        setSelectedMassas(prev => {
            const exists = prev.find(m => m.id === id);
            if (exists) return prev.filter(m => m.id !== id);
            return [...prev, { id, gramas: '' }];
        });
    };

    const updateGramasMassa = (id: string, gramas: string) => {
        setSelectedMassas(prev => prev.map(m => m.id === id ? { ...m, gramas } : m));
    };

    // --- Handlers Multi-select Recheio ---
    const toggleRecheio = (id: string) => {
        setSelectedRecheios(prev => {
            const exists = prev.find(r => r.id === id);
            if (exists) return prev.filter(r => r.id !== id);
            return [...prev, { id, gramas: '' }];
        });
    };

    const updateGramasRecheio = (id: string, gramas: string) => {
        setSelectedRecheios(prev => prev.map(r => r.id === id ? { ...r, gramas } : r));
    };

    // --- Cálculos ---
    const custoUnitario = useMemo(() => {
        // Soma custo de todas as massas selecionadas
        const custoMassas = selectedMassas.reduce((acc, sel) => {
            const recipe = doughRecipes?.find(r => r.id === sel.id);
            if (!recipe || recipe.rendimento <= 0) return acc;
            const custoPorGrama = recipe.custoTotal / recipe.rendimento;
            const gramas = parseFloat(sel.gramas.replace(',', '.')) || 0;
            return acc + custoPorGrama * gramas;
        }, 0);

        // Soma custo de todos os recheios selecionados
        const custoRecheios = selectedRecheios.reduce((acc, sel) => {
            const recipe = fillingRecipes?.find(r => r.id === sel.id);
            if (!recipe || recipe.rendimento <= 0) return acc;
            const custoPorGrama = recipe.custoTotal / recipe.rendimento;
            const gramas = parseFloat(sel.gramas.replace(',', '.')) || 0;
            return acc + custoPorGrama * gramas;
        }, 0);

        const baseUnitCost = custoMassas + custoRecheios;

        const matPercentage = parseFloat(materialPercentage.replace(',', '.')) || 0;
        const consPercentage = parseFloat(consumoPercentage.replace(',', '.')) || 0;

        const materialCost = baseUnitCost * (matPercentage / 100);
        const consumoCost = baseUnitCost * (consPercentage / 100);

        return baseUnitCost + materialCost + consumoCost;
    }, [selectedMassas, selectedRecheios, doughRecipes, fillingRecipes, materialPercentage, consumoPercentage]);

    const custoTotal = useMemo(() => {
        const quant = parseFloat(quantidadeFinal);
        if (!custoUnitario || !quant || quant <= 0) return 0;
        return custoUnitario * quant;
    }, [custoUnitario, quantidadeFinal]);

    // --- Salvar ---
    const handleSaveProduct = () => {
        if (!firestore || !nome || selectedMassas.length === 0) {
            toast({ title: "Campos incompletos", description: "Nome e ao menos uma massa são obrigatórios.", variant: "destructive" });
            return;
        }

        const finalQuantityNum = parseFloat(quantidadeFinal) || 1;
        const matPercentageNum = parseFloat(materialPercentage.replace(',', '.')) || 0;
        const consPercentageNum = parseFloat(consumoPercentage.replace(',', '.')) || 0;

        // Monta nomes para exibição
        const nomesMassas = selectedMassas
            .map(sel => doughRecipes?.find(r => r.id === sel.id)?.nome || sel.id)
            .join(', ');
        const nomesRecheios = selectedRecheios
            .map(sel => fillingRecipes?.find(r => r.id === sel.id)?.nome || sel.id)
            .join(', ');

        const productData = {
            nome,
            massas: selectedMassas,
            nomeMassa: nomesMassas,
            recheios: selectedRecheios,
            nomeRecheio: nomesRecheios || null,
            materialPercentage: matPercentageNum,
            consumoPercentage: consPercentageNum,
            quantidadeFinal: finalQuantityNum,
            custoTotal: custoUnitario * finalQuantityNum,
            custoUnitario,
        };

        addDocumentNonBlocking(collection(firestore, 'produtos_finais'), { ...productData, dataCriacao: serverTimestamp() });
        toast({ title: "Produto Salvo!", description: `${nome} foi adicionado aos seus produtos.` });

        // Reset form
        setNome('');
        setSelectedMassas([]);
        setSelectedRecheios([]);
        setQuantidadeFinal('1');
        setMaterialPercentage('0');
        setConsumoPercentage('0');
    };

    return (
        <Card className="bg-background/50 border-primary/20">
            <CardHeader>
                <CardTitle>Produto Final</CardTitle>
                <CardDescription>Monte seu produto com base nas receitas para calcular o custo unitário.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

                {/* Nome do Produto */}
                <div className="space-y-2">
                    <Label htmlFor="product-name">Nome do Produto Final</Label>
                    <Input
                        id="product-name"
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        placeholder="Ex: Bolo no pote Ninho com Brigadeiro"
                    />
                </div>

                {/* Multi-select de Massas */}
                <div className="space-y-3">
                    <Label className="text-base font-semibold">Receitas de Massa</Label>
                    {isLoadingDough ? (
                        <Skeleton className="h-10 w-full" />
                    ) : doughRecipes && doughRecipes.length > 0 ? (
                        <div className="space-y-2 border rounded-md p-3">
                            {doughRecipes.map(recipe => {
                                const selected = selectedMassas.find(m => m.id === recipe.id);
                                return (
                                    <div key={recipe.id}>
                                        {/* Checkbox da massa */}
                                        <div
                                            className={cn(
                                                "flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors",
                                                selected ? "bg-primary/10" : "hover:bg-muted/50"
                                            )}
                                            onClick={() => toggleMassa(recipe.id)}
                                        >
                                            <div className={cn(
                                                "h-4 w-4 rounded border-2 flex items-center justify-center shrink-0",
                                                selected ? "bg-primary border-primary" : "border-muted-foreground"
                                            )}>
                                                {selected && <Check className="h-3 w-3 text-primary-foreground" />}
                                            </div>
                                            <span className="font-medium">{recipe.nome}</span>
                                            <span className="text-xs text-muted-foreground ml-auto">
                                                {formatCurrency(recipe.custoTotal / recipe.rendimento)}/g
                                            </span>
                                        </div>

                                        {/* Campo de gramas — aparece só se selecionado */}
                                        {selected && (
                                            <div className="ml-7 mt-1 mb-2 flex items-center gap-2">
                                                <Input
                                                    type="number"
                                                    placeholder="Ex: 100"
                                                    value={selected.gramas}
                                                    onChange={(e) => updateGramasMassa(recipe.id, e.target.value)}
                                                    className="w-40 h-8 text-sm"
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                                <span className="text-sm text-muted-foreground">gramas usados</span>
                                                {selected.gramas && (
                                                    <span className="text-sm font-medium text-primary ml-auto">
                                                        = {formatCurrency(
                                                            (recipe.custoTotal / recipe.rendimento) *
                                                            (parseFloat(selected.gramas.replace(',', '.')) || 0)
                                                        )}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground p-3 border rounded-md">
                            Nenhuma receita de massa encontrada. Crie uma na aba "Massa".
                        </p>
                    )}
                </div>

                {/* Multi-select de Recheios */}
                <div className="space-y-3">
                    <Label className="text-base font-semibold">Receitas de Recheio <span className="text-muted-foreground font-normal text-sm">(Opcional)</span></Label>
                    {isLoadingFilling ? (
                        <Skeleton className="h-10 w-full" />
                    ) : fillingRecipes && fillingRecipes.length > 0 ? (
                        <div className="space-y-2 border rounded-md p-3">
                            {fillingRecipes.map(recipe => {
                                const selected = selectedRecheios.find(r => r.id === recipe.id);
                                return (
                                    <div key={recipe.id}>
                                        {/* Checkbox do recheio */}
                                        <div
                                            className={cn(
                                                "flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors",
                                                selected ? "bg-primary/10" : "hover:bg-muted/50"
                                            )}
                                            onClick={() => toggleRecheio(recipe.id)}
                                        >
                                            <div className={cn(
                                                "h-4 w-4 rounded border-2 flex items-center justify-center shrink-0",
                                                selected ? "bg-primary border-primary" : "border-muted-foreground"
                                            )}>
                                                {selected && <Check className="h-3 w-3 text-primary-foreground" />}
                                            </div>
                                            <span className="font-medium">{recipe.nome}</span>
                                            <span className="text-xs text-muted-foreground ml-auto">
                                                {formatCurrency(recipe.custoTotal / recipe.rendimento)}/g
                                            </span>
                                        </div>

                                        {/* Campo de gramas — aparece só se selecionado */}
                                        {selected && (
                                            <div className="ml-7 mt-1 mb-2 flex items-center gap-2">
                                                <Input
                                                    type="number"
                                                    placeholder="Ex: 50"
                                                    value={selected.gramas}
                                                    onChange={(e) => updateGramasRecheio(recipe.id, e.target.value)}
                                                    className="w-40 h-8 text-sm"
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                                <span className="text-sm text-muted-foreground">gramas usados</span>
                                                {selected.gramas && (
                                                    <span className="text-sm font-medium text-primary ml-auto">
                                                        = {formatCurrency(
                                                            (recipe.custoTotal / recipe.rendimento) *
                                                            (parseFloat(selected.gramas.replace(',', '.')) || 0)
                                                        )}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground p-3 border rounded-md">
                            Nenhuma receita de recheio encontrada.
                        </p>
                    )}
                </div>

                {/* Porcentagens Adicionais */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Adicional de Material (%)</Label>
                        <Input type="number" value={materialPercentage} onChange={e => setMaterialPercentage(e.target.value)} placeholder="0" />
                    </div>
                    <div className="space-y-2">
                        <Label>Adicional de Consumo (%)</Label>
                        <Input type="number" value={consumoPercentage} onChange={e => setConsumoPercentage(e.target.value)} placeholder="0" />
                    </div>
                </div>

                <Separator />

                {/* Resumo de Preços */}
                <div className="p-4 bg-primary/5 rounded-lg text-center space-y-1">
                    <p className="text-sm text-muted-foreground italic">Custo por Unidade</p>
                    <h2 className="text-3xl font-bold text-primary">{formatCurrency(custoUnitario)}</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Quantidade a Produzir</Label>
                        <Input type="number" value={quantidadeFinal} onChange={e => setQuantidadeFinal(e.target.value)} />
                    </div>
                    <div className="space-y-2 flex flex-col justify-end text-right">
                        <p className="text-sm text-muted-foreground italic">Custo Total da Produção</p>
                        <p className="text-2xl font-bold">{formatCurrency(custoTotal)}</p>
                    </div>
                </div>

                <Button onClick={handleSaveProduct} className="w-full">
                    <Save className="mr-2 h-4 w-4" /> Salvar Produto Final
                </Button>
            </CardContent>
        </Card>
    );
}

// --- GERENCIADOR DE PRODUTOS SALVOS ---
const SavedProductsManager = () => {
    const firestore = useFirestore();
    const { toast } = useToast();

    const productsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'produtos_finais') : null, [firestore]);
    const { data: products, isLoading } = useCollection<FinalProduct>(productsQuery);

    const handleDelete = (id: string) => {
        if (!firestore) return;
        deleteDocumentNonBlocking(doc(firestore, 'produtos_finais', id));
        toast({ title: "Produto deletado!", variant: "destructive" });
    }

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
                                <TableHead className="text-right w-[80px]">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({length: 4}).map((_, i) => (
                                    <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-5 w-full"/></TableCell></TableRow>
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
                                                    <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive/80" /></Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader><AlertDialogTitle>Você tem certeza?</AlertDialogTitle><AlertDialogDescription>Essa ação não pode ser desfeita. Isso irá deletar permanentemente o produto "{product.nome}".</AlertDialogDescription></AlertDialogHeader>
                                                    <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(product.id)}>Deletar</AlertDialogAction></AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={5} className="text-center h-24">Nenhum produto final salvo.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}

// --- COMPONENTE PRINCIPAL DO FLUXO ---
export function RecipeFlow() {
  return (
    <Tabs defaultValue="creator" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="creator">Nova Receita</TabsTrigger>
        <TabsTrigger value="saved">Produtos Salvos</TabsTrigger>
      </TabsList>
      <TabsContent value="creator">
        <Tabs defaultValue="dough" className="w-full mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dough">1. Massa</TabsTrigger>
            <TabsTrigger value="filling">2. Recheio</TabsTrigger>
            <TabsTrigger value="product">3. Produto Final</TabsTrigger>
          </TabsList>
          <TabsContent value="dough" className="mt-4">
            <RecipeManager recipeType="dough" title="Massa" description="Crie e gerencie suas receitas de massa." collectionName="receitas_massa" />
          </TabsContent>
          <TabsContent value="filling" className="mt-4">
             <RecipeManager recipeType="filling" title="Recheio" description="Crie e gerencie suas receitas de recheio." collectionName="receitas_recheio" />
          </TabsContent>
          <TabsContent value="product" className="mt-4">
            <FinalProductManager />
          </TabsContent>
        </Tabs>
      </TabsContent>
      <TabsContent value="saved" className="mt-4">
        <SavedProductsManager />
      </TabsContent>
    </Tabs>
  );
}
