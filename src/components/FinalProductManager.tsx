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

interface FinalProductManagerProps {
  productToEdit?: FinalProduct | null;  // se passado, entra em modo edição
  onSaved?: () => void;                 // callback ao salvar em modo edição
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
  const [margemLucro, setMargemLucro] = useState('0');

  // Preenche os campos quando estiver editando
  useEffect(() => {
    if (productToEdit) {
      setNome(productToEdit.nome || '');
      setMassasAdicionadas(productToEdit.massas || []);
      setRecheiosAdicionados(productToEdit.recheios || []);
      setQuantidadeFinal(String(productToEdit.quantidadeFinal || 1));
      setMaterialPercentage(String(productToEdit.materialPercentage || 0));
      setConsumoPercentage(String(productToEdit.consumoPercentage || 0));
      setMaoDeObra(String(productToEdit.maoDeObra || 0));
      setMargemLucro(String(productToEdit.margemLucro || 0));
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

  const precoVendaSugerido = useMemo(() => {
    const margem = parseFloat(margemLucro.replace(',', '.')) || 0;
    if (margem >= 100) return 0;
    if (margem <= 0) return custoUnitario;
    return custoUnitario / (1 - margem / 100);
  }, [custoUnitario, margemLucro]);

  const lucroUnitario = useMemo(() => precoVendaSugerido - custoUnitario, [precoVendaSugerido, custoUnitario]);

  const resetForm = () => {
    setNome('');
    setMassasAdicionadas([]);
    setRecheiosAdicionados([]);
    setQuantidadeFinal('1');
    setMaterialPercentage('0');
    setConsumoPercentage('0');
    setMaoDeObra('0');
    setMargemLucro('0');
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
      margemLucro: parseFloat(margemLucro.replace(',', '.')) || 0,
      precoVenda: precoVendaSugerido,
      quantidadeFinal: finalQuantityNum,
      custoTotal: custoUnitario * finalQuantityNum,
      custoUnitario,
    };

    if (isEditing && productToEdit) {
      // Atualiza documento existente
      updateDocumentNonBlocking(doc(firestore, 'produtos_finais', productToEdit.id), productData);
      toast({ title: "Produto atualizado!", description: `${nome} foi atualizado com sucesso.` });
      onSaved?.();
    } else {
      // Cria novo documento
      addDocumentNonBlocking(collection(firestore, 'produtos_finais'), {
        ...productData,
        dataCriacao: serverTimestamp(),
      });
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

        {/* ── RESUMO DE CUSTOS ── */}
        <div className="p-4 bg-primary/5 rounded-lg text-center space-y-1">
          <p className="text-sm text-muted-foreground italic">Custo por Unidade</p>
          <h2 className="text-3xl font-bold text-primary">{formatCurrency(custoUnitario)}</h2>
        </div>

        {/* ── MARGEM DE LUCRO ── */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">Precificação</Label>
          <div className="space-y-2">
            <Label>Margem de Lucro (%)</Label>
            <Input type="number" value={margemLucro} onChange={e => setMargemLucro(e.target.value)} placeholder="Ex: 30" />
            <p className="text-xs text-muted-foreground">Ex: 30% significa que 30% do preço de venda é lucro.</p>
          </div>
          {parseFloat(margemLucro) > 0 && custoUnitario > 0 && (
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-center space-y-1">
                <p className="text-xs text-muted-foreground">Preço de Venda Sugerido</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(precoVendaSugerido)}</p>
              </div>
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-center space-y-1">
                <p className="text-xs text-muted-foreground">Lucro por Unidade</p>
                <p className="text-xl font-bold text-blue-600">{formatCurrency(lucroUnitario)}</p>
              </div>
            </div>
          )}
        </div>

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
            {parseFloat(margemLucro) > 0 && (
              <p className="text-sm text-green-600 font-medium">
                Venda total: {formatCurrency(precoVendaSugerido * (parseFloat(quantidadeFinal) || 1))}
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