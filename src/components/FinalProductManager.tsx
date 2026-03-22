"use client";
import React, { useState, useMemo, useEffect } from 'react';
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
import { collection, doc, serverTimestamp } from 'firebase/firestore';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { DoughRecipe, FillingRecipe, FinalProduct } from '@/lib/types';

const formatCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined || isNaN(value) || !isFinite(value)) return "R$ 0,00";
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

// Calcula preço de venda a partir do custo e margem desejada
const calcPrecoVenda = (custo: number, margem: number) => {
  if (margem >= 100 || custo <= 0) return 0;
  if (margem <= 0) return custo;
  return custo / (1 - margem / 100);
};

interface FinalProductManagerProps {
  productToEdit?: FinalProduct | null;
  onSaved?: () => void;
}

export const FinalProductManager = ({ productToEdit, onSaved }: FinalProductManagerProps = {}) => {
  const { toast } = useToast();
  const firestore = useFirestore();
  const isEditing = !!productToEdit;

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
  const [maoDeObra, setMaoDeObra] = useState('0');

  // 3 cenários de precificação
  const [margemMinima, setMargemMinima] = useState('20');   // preço mínimo
  const [margemIdeal, setMargemIdeal] = useState('35');     // preço ideal
  const [margemVenda, setMargemVenda] = useState('50');     // preço de venda

  // Preenche campos no modo edição
  useEffect(() => {
    if (productToEdit) {
      setNome(productToEdit.nome || '');
      if (productToEdit.massas && productToEdit.massas.length > 0) {
        setMassasAdicionadas(productToEdit.massas);
      } else if (productToEdit.massaId) {
        setMassasAdicionadas([{ id: productToEdit.massaId, gramas: String(productToEdit.pesoMassa || '') }]);
      } else {
        setMassasAdicionadas([]);
      }
      if (productToEdit.recheios && productToEdit.recheios.length > 0) {
        setRecheiosAdicionados(productToEdit.recheios);
      } else if (productToEdit.recheioId && productToEdit.recheioId !== 'none') {
        setRecheiosAdicionados([{ id: productToEdit.recheioId, gramas: String(productToEdit.pesoRecheio || '') }]);
      } else {
        setRecheiosAdicionados([]);
      }
      setQuantidadeFinal(String(productToEdit.quantidadeFinal || 1));
      setMaterialPercentage(String(productToEdit.materialPercentage || 0));
      setConsumoPercentage(String(productToEdit.consumoPercentage || 0));
      setMaoDeObra(String(productToEdit.maoDeObra || 0));
      setMargemMinima(String(productToEdit.margemMinima || 20));
      setMargemIdeal(String(productToEdit.margemIdeal || 35));
      setMargemVenda(String(productToEdit.margemVenda || 50));
    }
  }, [productToEdit]);

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
    const mao = parseFloat(maoDeObra.replace(',', '.')) || 0;
    return base + base * (mat / 100) + base * (cons / 100) + mao;
  }, [massasAdicionadas, recheiosAdicionados, doughRecipes, fillingRecipes, materialPercentage, consumoPercentage, maoDeObra]);

  const custoTotal = useMemo(() => {
    const quant = parseFloat(quantidadeFinal);
    if (!custoUnitario || !quant || quant <= 0) return 0;
    return custoUnitario * quant;
  }, [custoUnitario, quantidadeFinal]);

  // 3 preços calculados
  const precoMinimo = useMemo(() => calcPrecoVenda(custoUnitario, parseFloat(margemMinima) || 0), [custoUnitario, margemMinima]);
  const precoIdeal  = useMemo(() => calcPrecoVenda(custoUnitario, parseFloat(margemIdeal) || 0),  [custoUnitario, margemIdeal]);
  const precoVenda  = useMemo(() => calcPrecoVenda(custoUnitario, parseFloat(margemVenda) || 0),  [custoUnitario, margemVenda]);

  const resetForm = () => {
    setNome('');
    setMassasAdicionadas([]);
    setRecheiosAdicionados([]);
    setQuantidadeFinal('1');
    setMaterialPercentage('0');
    setConsumoPercentage('0');
    setMaoDeObra('0');
    setMargemMinima('20');
    setMargemIdeal('35');
    setMargemVenda('50');
  };

  const handleSaveProduct = () => {
    if (!firestore || !nome || massasAdicionadas.length === 0) {
      toast({ title: "Campos incompletos", description: "Nome e ao menos uma massa são obrigatórios.", variant: "destructive" });
      return;
    }
    const finalQuantityNum = parseFloat(quantidadeFinal) || 1;
    const nomesMassas = massasAdicionadas.map(sel => doughRecipes?.find(r => r.id === sel.id)?.nome || sel.id).join(', ');
    const nomesRecheios = recheiosAdicionados.map(sel => fillingRecipes?.find(r => r.id === sel.id)?.nome || sel.id).join(', ');

    const productData = {
      nome,
      massas: massasAdicionadas,
      nomeMassa: nomesMassas,
      recheios: recheiosAdicionados,
      nomeRecheio: nomesRecheios || null,
      materialPercentage: parseFloat(materialPercentage.replace(',', '.')) || 0,
      consumoPercentage: parseFloat(consumoPercentage.replace(',', '.')) || 0,
      maoDeObra: parseFloat(maoDeObra.replace(',', '.')) || 0,
      margemMinima: parseFloat(margemMinima) || 0,
      margemIdeal: parseFloat(margemIdeal) || 0,
      margemVenda: parseFloat(margemVenda) || 0,
      precoMinimo,
      precoIdeal,
      precoVenda,
      quantidadeFinal: finalQuantityNum,
      custoTotal: custoUnitario * finalQuantityNum,
      custoUnitario,
    };

    if (isEditing && productToEdit) {
      updateDocumentNonBlocking(doc(firestore, 'produtos_finais', productToEdit.id), productData);
      toast({ title: "Produto atualizado!", description: `${nome} foi atualizado com sucesso.` });
      onSaved?.();
    } else {
      addDocumentNonBlocking(collection(firestore, 'produtos_finais'), { ...productData, dataCriacao: serverTimestamp() });
      toast({ title: "Produto Salvo!", description: `${nome} foi adicionado aos seus produtos.` });
      resetForm();
    }
  };

  return (
    <Card className={isEditing ? "border-0 shadow-none" : "bg-background/50 border-primary/20"}>
      {!isEditing && (
        <CardHeader>
          <CardTitle>Produto Final</CardTitle>
          <CardDescription>Monte seu produto com base nas receitas para calcular o custo unitário.</CardDescription>
        </CardHeader>
      )}
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
                  {isLoadingDough ? <SelectItem value="loading" disabled>Carregando...</SelectItem>
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
                  {isLoadingFilling ? <SelectItem value="loading" disabled>Carregando...</SelectItem>
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

        {/* ── CUSTOS ADICIONAIS ── */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">Custos Adicionais</Label>
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
          <div className="space-y-2">
            <Label>Mão de Obra por Unidade (R$)</Label>
            <Input type="number" value={maoDeObra} onChange={e => setMaoDeObra(e.target.value)} placeholder="Ex: 5,00" />
            <p className="text-xs text-muted-foreground">Valor fixo em reais adicionado ao custo de cada unidade.</p>
          </div>
        </div>

        <Separator />

        {/* ── CUSTO UNITÁRIO ── */}
        <div className="p-4 bg-primary/5 rounded-lg text-center space-y-1">
          <p className="text-sm text-muted-foreground italic">Custo por Unidade</p>
          <h2 className="text-3xl font-bold text-primary">{formatCurrency(custoUnitario)}</h2>
        </div>

        {/* ── PRECIFICAÇÃO COMPLETA ── */}
        {custoUnitario > 0 && (
          <div className="space-y-3">
            <Label className="text-base font-semibold">Precificação</Label>
            <p className="text-xs text-muted-foreground">Defina 3 cenários de margem. O preço de venda é calculado automaticamente.</p>

            <div className="grid grid-cols-3 gap-3">

              {/* Preço Mínimo */}
              <div className="space-y-2">
                <div className="p-3 border rounded-lg space-y-2">
                  <p className="text-xs font-medium text-center text-muted-foreground">🔴 Mínimo</p>
                  <div className="space-y-1">
                    <Label className="text-xs">Margem (%)</Label>
                    <Input
                      type="number"
                      value={margemMinima}
                      onChange={e => setMargemMinima(e.target.value)}
                      className="h-8 text-sm"
                      placeholder="20"
                    />
                  </div>
                  <div className="text-center pt-1">
                    <p className="text-xs text-muted-foreground">Preço</p>
                    <p className="text-lg font-bold text-red-500">{formatCurrency(precoMinimo)}</p>
                    <p className="text-xs text-muted-foreground">Lucro: {formatCurrency(precoMinimo - custoUnitario)}</p>
                  </div>
                </div>
              </div>

              {/* Preço Ideal */}
              <div className="space-y-2">
                <div className="p-3 border-2 border-primary/40 rounded-lg space-y-2 bg-primary/5">
                  <p className="text-xs font-medium text-center text-primary">⭐ Ideal</p>
                  <div className="space-y-1">
                    <Label className="text-xs">Margem (%)</Label>
                    <Input
                      type="number"
                      value={margemIdeal}
                      onChange={e => setMargemIdeal(e.target.value)}
                      className="h-8 text-sm"
                      placeholder="35"
                    />
                  </div>
                  <div className="text-center pt-1">
                    <p className="text-xs text-muted-foreground">Preço</p>
                    <p className="text-lg font-bold text-primary">{formatCurrency(precoIdeal)}</p>
                    <p className="text-xs text-muted-foreground">Lucro: {formatCurrency(precoIdeal - custoUnitario)}</p>
                  </div>
                </div>
              </div>

              {/* Preço de Venda */}
              <div className="space-y-2">
                <div className="p-3 border rounded-lg space-y-2">
                  <p className="text-xs font-medium text-center text-green-600">💰 Venda</p>
                  <div className="space-y-1">
                    <Label className="text-xs">Margem (%)</Label>
                    <Input
                      type="number"
                      value={margemVenda}
                      onChange={e => setMargemVenda(e.target.value)}
                      className="h-8 text-sm"
                      placeholder="50"
                    />
                  </div>
                  <div className="text-center pt-1">
                    <p className="text-xs text-muted-foreground">Preço</p>
                    <p className="text-lg font-bold text-green-600">{formatCurrency(precoVenda)}</p>
                    <p className="text-xs text-muted-foreground">Lucro: {formatCurrency(precoVenda - custoUnitario)}</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        <Separator />

        {/* ── QUANTIDADE E TOTAL ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Quantidade a Produzir</Label>
            <Input type="number" value={quantidadeFinal} onChange={e => setQuantidadeFinal(e.target.value)} />
          </div>
          <div className="space-y-2 flex flex-col justify-end text-right">
            <p className="text-sm text-muted-foreground italic">Custo Total da Produção</p>
            <p className="text-2xl font-bold">{formatCurrency(custoTotal)}</p>
            {custoUnitario > 0 && (
              <p className="text-sm text-green-600 font-medium">
                Venda ideal: {formatCurrency(precoIdeal * (parseFloat(quantidadeFinal) || 1))}
              </p>
            )}
          </div>
        </div>

        <Button onClick={handleSaveProduct} className="w-full">
          <Save className="mr-2 h-4 w-4" />
          {isEditing ? 'Salvar Alterações' : 'Salvar Produto Final'}
        </Button>
      </CardContent>
    </Card>
  );
};