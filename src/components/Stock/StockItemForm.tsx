// src/components/Stock/StockItemForm.tsx
"use client";

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { StockItem } from '@/lib/types';

// Converte qualquer unidade para a base (g ou ml)
// Retorna { valorConvertido, unidadeBase }
const converterParaBase = (valor: number, unidade: string): { valor: number; unidade: string } => {
  switch (unidade.toUpperCase()) {
    case 'KG':  return { valor: valor * 1000, unidade: 'G' };
    case 'MG':  return { valor: valor / 1000, unidade: 'G' };
    case 'L':   return { valor: valor * 1000, unidade: 'ML' };
    case 'G':   return { valor, unidade: 'G' };
    case 'ML':  return { valor, unidade: 'ML' };
    default:    return { valor, unidade: unidade.toUpperCase() };
  }
};

const UNIDADES = ['G', 'KG', 'MG', 'ML', 'L', 'UN'];

export const StockItemForm = ({
  item,
  onSave,
  closeDialog
}: {
  item?: StockItem;
  onSave: (item: Omit<StockItem, 'id' | 'dataAtualizacao'>) => void;
  closeDialog: () => void;
}) => {
  const [nome, setNome] = useState(item?.nome || '');
  const [preco, setPreco] = useState(item?.preco?.toString() || '');
  const [peso, setPeso] = useState(item?.peso?.toString() || '');
  const [unidade, setUnidade] = useState(item?.unidade || 'G');
  const [categoria, setCategoria] = useState<StockItem['categoria']>(item?.categoria || 'Ingrediente');
  const [previewConversao, setPreviewConversao] = useState<string | null>(null);
  const { toast } = useToast();

  // Mostra preview da conversão em tempo real
  useEffect(() => {
    const pesoNum = parseFloat(peso.replace(',', '.'));
    if (!pesoNum || pesoNum <= 0 || !unidade) { setPreviewConversao(null); return; }

    const { valor, unidade: unBase } = converterParaBase(pesoNum, unidade);

    // Só mostra preview se a unidade não for já a base
    if (['KG', 'MG', 'L'].includes(unidade.toUpperCase())) {
      setPreviewConversao(`→ Será salvo como ${valor.toFixed(valor < 1 ? 4 : 2)} ${unBase}`);
    } else {
      setPreviewConversao(null);
    }
  }, [peso, unidade]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const precoNum = parseFloat(preco.replace(',', '.'));
    const pesoNum = parseFloat(peso.replace(',', '.'));

    if (!nome || isNaN(precoNum) || precoNum < 0 || isNaN(pesoNum) || pesoNum <= 0 || !unidade || !categoria) {
      toast({
        title: "Campos inválidos",
        description: "Verifique se todos os campos estão preenchidos corretamente.",
        variant: "destructive"
      });
      return;
    }

    // Converte para unidade base antes de salvar
    const { valor: pesoConvertido, unidade: unidadeBase } = converterParaBase(pesoNum, unidade);

    onSave({
      nome,
      preco: precoNum,
      peso: pesoConvertido,
      unidade: unidadeBase as StockItem['unidade'],
      categoria,
    });
    closeDialog();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="nome">Nome do Produto/Ingrediente</Label>
        <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Farinha de Trigo" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="categoria">Categoria</Label>
        <Select value={categoria} onValueChange={(value) => setCategoria(value as StockItem['categoria'])}>
          <SelectTrigger id="categoria">
            <SelectValue placeholder="Selecione uma categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Ingrediente">Ingrediente</SelectItem>
            <SelectItem value="Material">Material (Embalagens, etc.)</SelectItem>
            <SelectItem value="Consumo">Consumo (Gás, Energia, etc.)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="preco">Preço (R$)</Label>
          <Input id="preco" value={preco} onChange={(e) => setPreco(e.target.value)} placeholder="10,50" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="peso">Peso/Qtd.</Label>
          <Input id="peso" value={peso} onChange={(e) => setPeso(e.target.value)} placeholder="Ex: 1" />
          {previewConversao && (
            <p className="text-xs text-primary">{previewConversao}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="unidade">Unidade de Medida</Label>
        <Select value={unidade} onValueChange={setUnidade}>
          <SelectTrigger id="unidade">
            <SelectValue placeholder="Selecione a unidade" />
          </SelectTrigger>
          <SelectContent>
            {UNIDADES.map(u => (
              <SelectItem key={u} value={u}>
                {u === 'G'  ? 'G — Gramas' :
                 u === 'KG' ? 'KG — Quilogramas (converte para g)' :
                 u === 'MG' ? 'MG — Miligramas (converte para g)' :
                 u === 'ML' ? 'ML — Mililitros' :
                 u === 'L'  ? 'L — Litros (converte para ml)' :
                              'UN — Unidade'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {['KG', 'MG', 'L'].includes(unidade.toUpperCase()) && (
          <p className="text-xs text-muted-foreground">
            Este valor será convertido automaticamente para a unidade base ao salvar.
          </p>
        )}
      </div>

      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">Cancelar</Button>
        </DialogClose>
        <Button type="submit"><Save className="mr-2 h-4 w-4" /> Salvar</Button>
      </DialogFooter>
    </form>
  );
};