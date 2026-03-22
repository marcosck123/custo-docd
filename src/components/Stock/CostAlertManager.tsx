"use client";
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { AlertTriangle, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import type { StockItem, DoughRecipe, FillingRecipe, FinalProduct } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

const formatCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined || isNaN(value) || !isFinite(value)) return "R$ 0,00";
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const formatPercent = (value: number) => {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
};

// Recalcula custo unitário de um produto com base nos preços atuais do estoque
const recalcularCustoUnitario = (
  product: FinalProduct,
  doughRecipes: DoughRecipe[],
  fillingRecipes: FillingRecipe[],
) => {
  const custoMassas = (product.massas || []).reduce((acc, sel) => {
    const recipe = doughRecipes.find(r => r.id === sel.id);
    if (!recipe || recipe.rendimento <= 0) return acc;
    return acc + (recipe.custoTotal / recipe.rendimento) * (parseFloat(sel.gramas) || 0);
  }, 0);

  const custoRecheios = (product.recheios || []).reduce((acc, sel) => {
    const recipe = fillingRecipes.find(r => r.id === sel.id);
    if (!recipe || recipe.rendimento <= 0) return acc;
    return acc + (recipe.custoTotal / recipe.rendimento) * (parseFloat(sel.gramas) || 0);
  }, 0);

  const base = custoMassas + custoRecheios;
  const mat = product.materialPercentage || 0;
  const cons = product.consumoPercentage || 0;
  const mao = product.maoDeObra || 0;
  return base + base * (mat / 100) + base * (cons / 100) + mao;
};

// Recalcula preço de venda com base no custo e margem
const recalcPreco = (custo: number, margem: number) => {
  if (!margem || margem >= 100 || custo <= 0) return custo;
  return custo / (1 - margem / 100);
};

interface ImpactoItem {
  produto: FinalProduct;
  custoAntigo: number;
  custoNovo: number;
  diferenca: number;
  percentual: number;
}

interface CostAlertManagerProps {
  // Chamado após atualizar um item do estoque para mostrar o impacto
  stockItemAtualizado?: { id: string; nomeAntigo: string; precoAntigo: number; precoNovo: number } | null;
  onClose?: () => void;
}

export const CostAlertManager = ({ stockItemAtualizado, onClose }: CostAlertManagerProps) => {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [recalculando, setRecalculando] = useState(false);

  const doughQuery = useMemoFirebase(() => firestore ? collection(firestore, 'receitas_massa') : null, [firestore]);
  const { data: doughRecipes } = useCollection<DoughRecipe>(doughQuery);

  const fillingQuery = useMemoFirebase(() => firestore ? collection(firestore, 'receitas_recheio') : null, [firestore]);
  const { data: fillingRecipes } = useCollection<FillingRecipe>(fillingQuery);

  const productsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'produtos_finais') : null, [firestore]);
  const { data: products } = useCollection<FinalProduct>(productsQuery);

  // Calcula impacto nos produtos
  const impactos: ImpactoItem[] = React.useMemo(() => {
    if (!products || !doughRecipes || !fillingRecipes) return [];

    return products
      .map(product => {
        const custoNovo = recalcularCustoUnitario(product, doughRecipes, fillingRecipes);
        const custoAntigo = product.custoUnitario || 0;
        const diferenca = custoNovo - custoAntigo;
        const percentual = custoAntigo > 0 ? (diferenca / custoAntigo) * 100 : 0;

        return { produto: product, custoAntigo, custoNovo, diferenca, percentual };
      })
      .filter(i => Math.abs(i.diferenca) > 0.001) // só os que mudaram
      .sort((a, b) => Math.abs(b.diferenca) - Math.abs(a.diferenca)); // mais impactados primeiro
  }, [products, doughRecipes, fillingRecipes]);

  // Recalcula e salva todos os produtos no Firestore
  const handleRecalcularTodos = async () => {
    if (!firestore || !products || !doughRecipes || !fillingRecipes) return;
    setRecalculando(true);

    let atualizados = 0;
    for (const product of products) {
      const custoNovo = recalcularCustoUnitario(product, doughRecipes, fillingRecipes);
      const quant = product.quantidadeFinal || 1;

      updateDocumentNonBlocking(doc(firestore, 'produtos_finais', product.id), {
        custoUnitario: custoNovo,
        custoTotal: custoNovo * quant,
        precoMinimo: recalcPreco(custoNovo, product.margemMinima || 0),
        precoIdeal:  recalcPreco(custoNovo, product.margemIdeal || 0),
        precoVenda:  recalcPreco(custoNovo, product.margemVenda || product.margemLucro || 0),
      });
      atualizados++;
    }

    setRecalculando(false);
    toast({
      title: `${atualizados} produto(s) recalculado(s)!`,
      description: "Todos os custos foram atualizados com os preços atuais do estoque.",
    });
    onClose?.();
  };

  const temImpacto = impactos.length > 0;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose?.(); }}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Impacto nos Produtos
          </DialogTitle>
          <DialogDescription>
            {stockItemAtualizado
              ? `O preço de "${stockItemAtualizado.nomeAntigo}" mudou de ${formatCurrency(stockItemAtualizado.precoAntigo)} para ${formatCurrency(stockItemAtualizado.precoNovo)}.`
              : 'Veja quais produtos tiveram o custo alterado com base nos preços atuais do estoque.'}
          </DialogDescription>
        </DialogHeader>

        {!temImpacto ? (
          <div className="py-8 text-center text-muted-foreground">
            <p>Nenhum produto foi afetado.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {impactos.map(({ produto, custoAntigo, custoNovo, diferenca, percentual }) => (
              <div key={produto.id} className="flex items-center justify-between p-3 rounded-md border bg-muted/30">
                <div>
                  <p className="font-medium text-sm">{produto.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    Custo: {formatCurrency(custoAntigo)} → {formatCurrency(custoNovo)}
                  </p>
                </div>
                <div className={`flex items-center gap-1 font-semibold text-sm ${diferenca > 0 ? 'text-red-500' : 'text-green-600'}`}>
                  {diferenca > 0
                    ? <TrendingUp className="h-4 w-4" />
                    : <TrendingDown className="h-4 w-4" />}
                  {formatCurrency(Math.abs(diferenca))} ({formatPercent(percentual)})
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Fechar</Button>
          <Button onClick={handleRecalcularTodos} disabled={recalculando}>
            <RefreshCw className={`mr-2 h-4 w-4 ${recalculando ? 'animate-spin' : ''}`} />
            {recalculando ? 'Recalculando...' : 'Recalcular Todos os Produtos'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};