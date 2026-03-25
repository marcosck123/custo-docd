"use client";

import React, { useMemo, useState } from "react";
import { collection, serverTimestamp } from "firebase/firestore";
import { Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { addDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import type { DoughRecipe, FillingRecipe, FinalProduct } from "@/lib/types";

import { formatCurrency } from "./utils";

export function FinalProductManager() {
  const { toast } = useToast();
  const firestore = useFirestore();

  const doughRecipesQuery = useMemoFirebase(() => (firestore ? collection(firestore, "receitas_massa") : null), [firestore]);
  const { data: doughRecipes, isLoading: isLoadingDough } = useCollection<DoughRecipe>(doughRecipesQuery);

  const fillingRecipesQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, "receitas_recheio") : null),
    [firestore]
  );
  const { data: fillingRecipes, isLoading: isLoadingFilling } = useCollection<FillingRecipe>(fillingRecipesQuery);

  const [nome, setNome] = useState("");
  const [massaId, setMassaId] = useState<string | undefined>(undefined);
  const [recheioId, setRecheioId] = useState<string | undefined>(undefined);
  const [pesoMassa, setPesoMassa] = useState("");
  const [pesoRecheio, setPesoRecheio] = useState("");
  const [quantidadeFinal, setQuantidadeFinal] = useState("1");
  const [materialPercentage, setMaterialPercentage] = useState("0");
  const [consumoPercentage, setConsumoPercentage] = useState("0");

  const selectedDough = useMemo(() => doughRecipes?.find((recipe) => recipe.id === massaId), [doughRecipes, massaId]);
  const selectedFilling = useMemo(
    () => fillingRecipes?.find((recipe) => recipe.id === recheioId),
    [fillingRecipes, recheioId]
  );

  const custoUnitario = useMemo(() => {
    const doughCostPerGram =
      selectedDough && selectedDough.rendimento > 0 ? selectedDough.custoTotal / selectedDough.rendimento : 0;
    const doughWeight = parseFloat(pesoMassa.replace(",", ".")) || 0;
    const doughCost = doughCostPerGram * doughWeight;

    const fillingCostPerGram =
      selectedFilling && selectedFilling.rendimento > 0
        ? selectedFilling.custoTotal / selectedFilling.rendimento
        : 0;
    const fillingWeight = parseFloat(pesoRecheio.replace(",", ".")) || 0;
    const fillingCost = fillingCostPerGram * fillingWeight;

    const baseUnitCost = doughCost + fillingCost;
    const materialCost = baseUnitCost * ((parseFloat(materialPercentage.replace(",", ".")) || 0) / 100);
    const consumoCost = baseUnitCost * ((parseFloat(consumoPercentage.replace(",", ".")) || 0) / 100);

    return baseUnitCost + materialCost + consumoCost;
  }, [selectedDough, selectedFilling, pesoMassa, pesoRecheio, materialPercentage, consumoPercentage]);

  const custoTotal = useMemo(() => {
    const quantity = parseFloat(quantidadeFinal);

    if (!custoUnitario || !quantity || quantity <= 0) return 0;

    return custoUnitario * quantity;
  }, [custoUnitario, quantidadeFinal]);

  const handleSaveProduct = () => {
    if (!firestore || !nome || !massaId || !selectedDough) {
      toast({
        title: "Campos incompletos",
        description: "Nome e massa são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    const finalQuantity = parseFloat(quantidadeFinal) || 1;
    const materialPct = parseFloat(materialPercentage.replace(",", ".")) || 0;
    const consumoPct = parseFloat(consumoPercentage.replace(",", ".")) || 0;

    const productData: Omit<FinalProduct, "id" | "dataCriacao"> = {
      nome,
      massaId,
      nomeMassa: selectedDough.nome,
      recheioId: recheioId === "none" ? null : recheioId || null,
      nomeRecheio: selectedFilling?.nome || null,
      materialPercentage: materialPct,
      consumoPercentage: consumoPct,
      quantidadeFinal: finalQuantity,
      custoTotal: custoUnitario * finalQuantity,
      custoUnitario,
    };

    addDocumentNonBlocking(collection(firestore, "produtos_finais"), {
      ...productData,
      dataCriacao: serverTimestamp(),
    });

    toast({ title: "Produto Salvo!", description: `${nome} foi adicionado aos seus produtos.` });

    setNome("");
    setMassaId(undefined);
    setRecheioId(undefined);
    setPesoMassa("");
    setPesoRecheio("");
    setQuantidadeFinal("1");
    setMaterialPercentage("0");
    setConsumoPercentage("0");
  };

  return (
    <Card className="border-primary/20 bg-background/50">
      <CardHeader>
        <CardTitle>Produto Final</CardTitle>
        <CardDescription>Monte seu produto com base nas receitas para calcular o custo unitário.</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="product-name">Nome do Produto Final</Label>
          <Input
            id="product-name"
            value={nome}
            onChange={(event) => setNome(event.target.value)}
            placeholder="Ex: Bolo no pote Ninho com Brigadeiro"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Receita da Massa</Label>
              <Select value={massaId} onValueChange={setMassaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a massa..." />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingDough ? (
                    <SelectItem value="loading" disabled>
                      Carregando...
                    </SelectItem>
                  ) : (
                    doughRecipes?.map((recipe) => (
                      <SelectItem key={recipe.id} value={recipe.id}>
                        {recipe.nome}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Qtd. de Massa por Unidade (g)</Label>
              <Input
                type="number"
                placeholder="Ex: 100"
                value={pesoMassa}
                onChange={(event) => setPesoMassa(event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Receita do Recheio (Opcional)</Label>
              <Select value={recheioId} onValueChange={setRecheioId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o recheio..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum recheio</SelectItem>
                  {isLoadingFilling ? (
                    <SelectItem value="loading-filling" disabled>
                      Carregando...
                    </SelectItem>
                  ) : (
                    fillingRecipes?.map((recipe) => (
                      <SelectItem key={recipe.id} value={recipe.id}>
                        {recipe.nome}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Qtd. de Recheio por Unidade (g)</Label>
              <Input
                type="number"
                placeholder="Ex: 50"
                value={pesoRecheio}
                onChange={(event) => setPesoRecheio(event.target.value)}
                disabled={recheioId === "none" || !recheioId}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Adicional de Material (%)</Label>
            <Input
              type="number"
              value={materialPercentage}
              onChange={(event) => setMaterialPercentage(event.target.value)}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <Label>Adicional de Consumo (%)</Label>
            <Input
              type="number"
              value={consumoPercentage}
              onChange={(event) => setConsumoPercentage(event.target.value)}
              placeholder="0"
            />
          </div>
        </div>

        <Separator />

        <div className="space-y-1 rounded-lg bg-primary/5 p-4 text-center">
          <p className="text-sm italic text-muted-foreground">Custo por Unidade</p>
          <h2 className="text-3xl font-bold text-primary">{formatCurrency(custoUnitario)}</h2>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Quantidade a Produzir</Label>
            <Input type="number" value={quantidadeFinal} onChange={(event) => setQuantidadeFinal(event.target.value)} />
          </div>
          <div className="flex flex-col justify-end space-y-2 text-right">
            <p className="text-sm italic text-muted-foreground">Custo Total da Produção</p>
            <p className="text-2xl font-bold">{formatCurrency(custoTotal)}</p>
          </div>
        </div>

        <Button onClick={handleSaveProduct} className="w-full">
          <Save className="mr-2 h-4 w-4" />
          Salvar Produto Final
        </Button>
      </CardContent>
    </Card>
  );
}
