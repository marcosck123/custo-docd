"use client";
import React, { useState, useMemo, useCallback, useEffect } from 'react';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useToast } from '@/hooks/use-toast';
import { Check, ChevronsUpDown, PlusCircle, Trash2, Edit, Save, XCircle } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, serverTimestamp } from 'firebase/firestore';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { StockItem, RecipeIngredient, DoughRecipe, FillingRecipe, FinalProduct } from '@/lib/types';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
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
  recipeToEdit
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
  const [isIngredientSelectOpen, setIsIngredientSelectOpen] = useState(false);

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
            <Popover open={isIngredientSelectOpen} onOpenChange={setIsIngredientSelectOpen}>
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
              <PopoverContent
                className="w-[var(--radix-popover-trigger-width)] p-0"
                align="start"
              >
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
    const [massaId, setMassaId] = useState<string | undefined>(undefined);
    const [recheioId, setRecheioId] = useState<string | undefined>(undefined);
    const [pesoMassa, setPesoMassa] = useState('');
    const [pesoRecheio, setPesoRecheio] = useState('');
    const [quantidadeFinal, setQuantidadeFinal] = useState('1');
    const [materialPercentage, setMaterialPercentage] = useState('0');
    const [consumoPercentage, setConsumoPercentage] = useState('0');

   // Calculations
const selectedDough = useMemo(() => doughRecipes?.find(r => r.id === massaId), [doughRecipes, massaId]);
const selectedFilling = useMemo(() => fillingRecipes?.find(r => r.id === recheioId), [fillingRecipes, recheioId]);

const custoUnitario = useMemo(() => {
    // 1. Cálculo da Massa
    const custoMassaPorGrama = (selectedDough && selectedDough.rendimento > 0) 
        ? (selectedDough.custoTotal / selectedDough.rendimento) 
        : 0;
    const pesoM = parseFloat(pesoMassa.replace(',', '.')) || 0;
    const custoMassaFinal = custoMassaPorGrama * pesoM;

    // 2. Cálculo do Recheio
    const custoRecheioPorGrama = (selectedFilling && selectedFilling.rendimento > 0) 
        ? (selectedFilling.custoTotal / selectedFilling.rendimento) 
        : 0;
    const pesoR = parseFloat(pesoRecheio.replace(',', '.')) || 0;
    const custoRecheioFinal = custoRecheioPorGrama * pesoR;

    // 3. Soma os custos base
    const baseUnitCost = custoMassaFinal + custoRecheioFinal;

    // 4. Aplica as porcentagens
    const matPercentage = parseFloat(materialPercentage.replace(',', '.')) || 0;
    const consPercentage = parseFloat(consumoPercentage.replace(',', '.')) || 0;

    const materialCost = baseUnitCost * (matPercentage / 100);
    const consumoCost = baseUnitCost * (consPercentage / 100);

    return baseUnitCost + materialCost + consumoCost;
}, [selectedDough, selectedFilling, pesoMassa, pesoRecheio, materialPercentage, consumoPercentage]);

const custoTotal = useMemo(() => {
    const quant = parseFloat(quantidadeFinal);
    if (!custoUnitario || !quant || quant <= 0) return 0;
    return custoUnitario * quant;
}, [custoUnitario, quantidadeFinal]);

    // Handlers
    const handleSaveProduct = () => {
        if (!firestore || !nome || !massaId || !selectedDough) {
            toast({ title: "Campos incompletos", description: "Nome e massa são obrigatórios.", variant: "destructive" });
            return;
        }

        const finalQuantityNum = parseFloat(quantidadeFinal) || 1;
        const matPercentageNum = parseFloat(materialPercentage.replace(',', '.')) || 0;
        const consPercentageNum = parseFloat(consumoPercentage.replace(',', '.')) || 0;

        const productData: Omit<FinalProduct, 'id' | 'dataCriacao'> = {
            nome,
            massaId,
            nomeMassa: selectedDough.nome,
            recheioId: recheioId === 'none' ? null : recheioId || null,
            nomeRecheio: selectedFilling?.nome || null,
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
        setMassaId(undefined);
        setRecheioId(undefined);
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

                {/* Seleção de Receitas e Pesos */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Receita da Massa</Label>
                            <Select value={massaId} onValueChange={setMassaId}>
                                <SelectTrigger><SelectValue placeholder="Selecione a massa..." /></SelectTrigger>
                                <SelectContent>
                                    {isLoadingDough ? <SelectItem value="loading" disabled>Carregando...</SelectItem> :
                                     doughRecipes?.map(r => <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Qtd. de Massa por Unidade (g)</Label>
                            <Input 
                                type="number" 
                                placeholder="Ex: 100" 
                                value={pesoMassa} 
                                onChange={(e) => setPesoMassa(e.target.value)} 
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Receita do Recheio (Opcional)</Label>
                            <Select value={recheioId} onValueChange={setRecheioId}>
                                <SelectTrigger><SelectValue placeholder="Selecione o recheio..." /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Nenhum recheio</SelectItem>
                                    {isLoadingFilling ? <SelectItem value="loading-filling" disabled>Carregando...</SelectItem> :
                                     fillingRecipes?.map(r => <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Qtd. de Recheio por Unidade (g)</Label>
                            <Input 
                                type="number" 
                                placeholder="Ex: 50" 
                                value={pesoRecheio} 
                                onChange={(e) => setPesoRecheio(e.target.value)} 
                                disabled={recheioId === 'none' || !recheioId} 
                            />
                        </div>
                    </div>
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
