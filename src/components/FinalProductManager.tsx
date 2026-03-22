"use client";
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Save, XCircle } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, serverTimestamp } from 'firebase/firestore';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { DoughRecipe, FillingRecipe } from '@/lib/types';

const formatCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined || isNaN(value) || !isFinite(value)) return "R$ 0,00";
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export const FinalProductManager = () => {
  const { toast } = useToast();
  const firestore = useFirestore();

  const doughRecipesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'receitas_massa') : null, [firestore]);
  const { data: doughRecipes, isLoading: isLoadingDough } = useCollection<DoughRecipe>(doughRecipesQuery);

  const fillingRecipesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'receitas_recheio') : null, [firestore]);
  const { data: fillingRecipes, isLoading: isLoadingFilling } = useCollection<FillingRecipe>(fillingRecipesQuery);

  const [nome, setNome] = useState('');
  const [massasAdicionadas, setMassasAdicionadas] = useState<{ id: string; gramas: string }[]>([]);
  const [recheiosAdicionados, setRecheiosAdicionados] = useState<{ id: string; gramas: string }[]>([]);
  const [massaSelecionadaId, setMassaSelecionadaId] = useState('');
  const [gramasMassa, setGramasMassa] = useState('');
  const [recheioSelecionadoId, setRecheioSelecionadoId] = useState('');
  const [gramasRecheio, setGramasRecheio] = useState('');
  const [quantidadeFinal, setQuantidadeFinal] = useState('1');
  const [materialPercentage, setMaterialPercentage] = useState('0');
  const [consumoPercentage, setConsumoPercentage] = useState('0');

  const handleAdicionarMassa = () => {
    if (!massaSelecionadaId) { toast({ title: "Selecione uma massa", variant: "destructive" }); return; }
    const gramas = parseFloat(gramasMassa.replace(',', '.'));
    if (!gramas || gramas <= 0) { toast({ title: "Informe a quantidade em gramas", variant: "destructive" }); return; }
    if (massasAdicionadas.find(m => m.id === massaSelecionadaId)) {
      toast({ title: "Massa já adicionada", description: "Remova a existente para alterar.", variant: "destructive" }); return;
    }
    setMassasAdicionadas(prev => [...prev, { id: massaSelecionadaId, gramas: gramasMassa }]);
    setMassaSelecionadaId('');
    setGramasMassa('');
  };

  const handleAdicionarRecheio = () => {
    if (!recheioSelecionadoId) { toast({ title: "Selecione um recheio", variant: "destructive" }); return; }
    const gramas = parseFloat(gramasRecheio.replace(',', '.'));
    if (!gramas || gramas <= 0) { toast({ title: "Informe a quantidade em gramas", variant: "destructive" }); return; }
    if (recheiosAdicionados.find(r => r.id === recheioSelecionadoId)) {
      toast({ title: "Recheio já adicionado", description: "Remova o existente para alterar.", variant: "destructive" }); return;
    }
    setRecheiosAdicionados(prev => [...prev, { id: recheioSelecionadoId, gramas: gramasRecheio }]);
    setRecheioSelecionadoId('');
    setGramasRecheio('');
  };

  const removerMassa = (id: string) => setMassasAdicionadas(prev => prev.filter(m => m.id !== id));
  const removerRecheio = (id: string) => setRecheiosAdicionados(prev => prev.filter(r => r.id !== id));

  const custoUnitario = useMemo(() => {
    const custoMassas = massasAdicionadas.reduce((acc, sel) => {
      const recipe = doughRecipes?.find(r => r.id === sel.id);
      if (!recipe || recipe.rendimento <= 0) return acc;
      return acc + (recipe.custoTotal / recipe.rendimento) * (parseFloat(sel.gramas.replace(',', '.')) || 0);
    }, 0);
    const custoRecheios = recheiosAdicionados.reduce((acc, sel) => {
      const recipe = fillingRecipes?.find(r => r.id === sel.id);
      if (!recipe || recipe.rendimento <= 0) return acc;
      return acc + (recipe.custoTotal / recipe.rendimento) * (parseFloat(sel.gramas.replace(',', '.')) || 0);
    }, 0);
    const base = custoMassas + custoRecheios;
    const mat = parseFloat(materialPercentage.replace(',', '.')) || 0;
    const cons = parseFloat(consumoPercentage.replace(',', '.')) || 0;
    return base + base * (mat / 100) + base * (cons / 100);
  }, [massasAdicionadas, recheiosAdicionados, doughRecipes, fillingRecipes, materialPercentage, consumoPercentage]);

  const custoTotal = useMemo(() => {
    const quant = parseFloat(quantidadeFinal);
    if (!custoUnitario || !quant || quant <= 0) return 0;
    return custoUnitario * quant;
  }, [custoUnitario, quantidadeFinal]);

  const handleSaveProduct = () => {
    if (!firestore || !nome || massasAdicionadas.length === 0) {
      toast({ title: "Campos incompletos", description: "Nome e ao menos uma massa são obrigatórios.", variant: "destructive" });
      return;
    }
    const finalQuantityNum = parseFloat(quantidadeFinal) || 1;
    const nomesMassas = massasAdicionadas.map(sel => doughRecipes?.find(r => r.id === sel.id)?.nome || sel.id).join(', ');
    const nomesRecheios = recheiosAdicionados.map(sel => fillingRecipes?.find(r => r.id === sel.id)?.nome || sel.id).join(', ');

    addDocumentNonBlocking(collection(firestore, 'produtos_finais'), {
      nome,
      massas: massasAdicionadas,
      nomeMassa: nomesMassas,
      recheios: recheiosAdicionados,
      nomeRecheio: nomesRecheios || null,
      materialPercentage: parseFloat(materialPercentage.replace(',', '.')) || 0,
      consumoPercentage: parseFloat(consumoPercentage.replace(',', '.')) || 0,
      quantidadeFinal: finalQuantityNum,
      custoTotal: custoUnitario * finalQuantityNum,
      custoUnitario,
      dataCriacao: serverTimestamp(),
    });
    toast({ title: "Produto Salvo!", description: `${nome} foi adicionado aos seus produtos.` });

    setNome('');
    setMassasAdicionadas([]);
    setRecheiosAdicionados([]);
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

        {/* Nome */}
        <div className="space-y-2">
          <Label htmlFor="product-name">Nome do Produto Final</Label>
          <Input id="product-name" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Bolo no pote Ninho com Brigadeiro" />
        </div>

        {/* ── MASSAS ── */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">Massas</Label>
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1">
              <Label className="text-xs text-muted-foreground">Receita</Label>
              <Select value={massaSelecionadaId} onValueChange={setMassaSelecionadaId}>
                <SelectTrigger><SelectValue placeholder="Selecione a massa..." /></SelectTrigger>
                <SelectContent>
                  {isLoadingDough
                    ? <SelectItem value="loading" disabled>Carregando...</SelectItem>
                    : doughRecipes?.map(r => <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="w-28 space-y-1">
              <Label className="text-xs text-muted-foreground">Gramas (g)</Label>
              <Input type="number" placeholder="Ex: 100" value={gramasMassa} onChange={(e) => setGramasMassa(e.target.value)} />
            </div>
            <Button type="button" onClick={handleAdicionarMassa} className="shrink-0">
              <PlusCircle className="mr-2 h-4 w-4" /> Adicionar
            </Button>
          </div>
          {massasAdicionadas.length > 0 && (
            <div className="space-y-2">
              {massasAdicionadas.map(sel => {
                const recipe = doughRecipes?.find(r => r.id === sel.id);
                const custo = recipe ? (recipe.custoTotal / recipe.rendimento) * (parseFloat(sel.gramas.replace(',', '.')) || 0) : 0;
                return (
                  <div key={sel.id} className="flex items-center justify-between px-3 py-2 rounded-md bg-muted/50 border">
                    <div>
                      <p className="text-sm font-medium">{recipe?.nome}</p>
                      <p className="text-xs text-muted-foreground">{sel.gramas}g — {formatCurrency(custo)}</p>
                    </div>
                    <Button variant="ghost" size="icon" type="button" onClick={() => removerMassa(sel.id)}>
                      <XCircle className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── RECHEIOS ── */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">Recheios <span className="text-muted-foreground font-normal text-sm">(Opcional)</span></Label>
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1">
              <Label className="text-xs text-muted-foreground">Receita</Label>
              <Select value={recheioSelecionadoId} onValueChange={setRecheioSelecionadoId}>
                <SelectTrigger><SelectValue placeholder="Selecione o recheio..." /></SelectTrigger>
                <SelectContent>
                  {isLoadingFilling
                    ? <SelectItem value="loading" disabled>Carregando...</SelectItem>
                    : fillingRecipes?.map(r => <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="w-28 space-y-1">
              <Label className="text-xs text-muted-foreground">Gramas (g)</Label>
              <Input type="number" placeholder="Ex: 50" value={gramasRecheio} onChange={(e) => setGramasRecheio(e.target.value)} />
            </div>
            <Button type="button" onClick={handleAdicionarRecheio} className="shrink-0">
              <PlusCircle className="mr-2 h-4 w-4" /> Adicionar
            </Button>
          </div>
          {recheiosAdicionados.length > 0 && (
            <div className="space-y-2">
              {recheiosAdicionados.map(sel => {
                const recipe = fillingRecipes?.find(r => r.id === sel.id);
                const custo = recipe ? (recipe.custoTotal / recipe.rendimento) * (parseFloat(sel.gramas.replace(',', '.')) || 0) : 0;
                return (
                  <div key={sel.id} className="flex items-center justify-between px-3 py-2 rounded-md bg-muted/50 border">
                    <div>
                      <p className="text-sm font-medium">{recipe?.nome}</p>
                      <p className="text-xs text-muted-foreground">{sel.gramas}g — {formatCurrency(custo)}</p>
                    </div>
                    <Button variant="ghost" size="icon" type="button" onClick={() => removerRecheio(sel.id)}>
                      <XCircle className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Porcentagens */}
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
};