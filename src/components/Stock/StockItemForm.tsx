// src/components/stock/StockItemForm.tsx
"use client";

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { StockItem } from '@/lib/types';

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
  const [unidade, setUnidade] = useState(item?.unidade || '');
  const [categoria, setCategoria] = useState<StockItem['categoria']>(item?.categoria || 'Ingrediente');
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const precoNum = parseFloat(preco.replace(',', '.'));
    const pesoNum = parseFloat(peso.replace(',', '.'));

    if (!nome || isNaN(precoNum) || precoNum < 0 || isNaN(pesoNum) || pesoNum <= 0 || !unidade || !categoria) {
      toast({
        title: "Campos inválidos",
        description: "Verifique se todos os campos estão preenchidos corretamente. Preço e peso não podem ser negativos e o peso não pode ser zero.",
        variant: "destructive"
      });
      return;
    }

    onSave({ nome, preco: precoNum, peso: pesoNum, unidade, categoria });
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
          <Input id="peso" value={peso} onChange={(e) => setPeso(e.target.value)} placeholder="1000" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="unidade">Unidade de Medida</Label>
        <Input id="unidade" value={unidade} onChange={(e) => setUnidade(e.target.value)} placeholder="g, kg, ml, l, unidade" />
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
