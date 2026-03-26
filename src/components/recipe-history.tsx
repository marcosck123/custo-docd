"use client";

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, Trash2, Edit, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, serverTimestamp } from 'firebase/firestore';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { StockItem } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Skeleton } from './ui/skeleton';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const formatCurrency = (value: number) => {
  if (isNaN(value) || !isFinite(value)) {
    return "R$ 0,00";
  }
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const formatDate = (timestamp: any) => {
    if (timestamp && typeof timestamp.toDate === 'function') {
      return format(timestamp.toDate(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    }
    return 'Data indisponível';
};


const StockItemForm = ({ item, onSave, closeDialog }: { item?: StockItem, onSave: (item: Omit<StockItem, 'id' | 'dataAtualizacao'>) => void, closeDialog: () => void }) => {
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
            toast({ title: "Campos inválidos", description: "Verifique se todos os campos estão preenchidos corretamente. Preço e peso não podem ser negativos e o peso não pode ser zero.", variant: "destructive" });
            return;
        }

        onSave({ nome, preco: precoNum, peso: pesoNum, unidade: unidade as StockItem['unidade'], categoria });
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
    )
}

export function StockManager() {
    const { toast } = useToast();
    const firestore = useFirestore();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<StockItem | undefined>(undefined);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');

    const stockQuery = useMemoFirebase(() => firestore ? collection(firestore, 'estoque') : null, [firestore]);
    const { data: stockItems, isLoading } = useCollection<StockItem>(stockQuery);

    const filteredStockItems = useMemo(() => {
        if (!stockItems) {
            return [];
        }
        
        const byCategory = activeCategory === 'all'
            ? stockItems
            : stockItems.filter(item => item.categoria === activeCategory);

        return byCategory.filter(item =>
            item.nome.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [stockItems, searchTerm, activeCategory]);


    const handleSave = (itemData: Omit<StockItem, 'id' | 'dataAtualizacao'>) => {
        if (!firestore) return;
        
        const dataToSave = {
            ...itemData,
            dataAtualizacao: serverTimestamp(),
        };

        if (editingItem) {
            updateDocumentNonBlocking(doc(firestore, 'estoque', editingItem.id), dataToSave);
            toast({ title: "Item atualizado!", description: `${itemData.nome} foi atualizado no estoque.` });
        } else {
            addDocumentNonBlocking(collection(firestore, 'estoque'), dataToSave);
            toast({ title: "Item adicionado!", description: `${itemData.nome} foi adicionado ao estoque.` });
        }
        setEditingItem(undefined);
    };

    const handleDelete = (id: string) => {
        if (!firestore) return;
        deleteDocumentNonBlocking(doc(firestore, 'estoque', id));
        toast({ title: "Item deletado!", description: "O item foi removido do estoque." });
    };

    const openFormForEdit = (item: StockItem) => {
        setEditingItem(item);
        setIsFormOpen(true);
    }
    
    const openFormForNew = () => {
        setEditingItem(undefined);
        setIsFormOpen(true);
    }

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
        <div className="space-y-1">
          <CardTitle>Itens de Estoque</CardTitle>
          <CardDescription>Adicione, edite e remova os itens do seu inventário.</CardDescription>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
                <Button onClick={openFormForNew} size="sm">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Adicionar Item
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{editingItem ? 'Editar Item' : 'Adicionar Novo Item'}</DialogTitle>
                </DialogHeader>
                <StockItemForm item={editingItem} onSave={handleSave} closeDialog={() => setIsFormOpen(false)} />
            </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Tabs value={activeCategory} onValueChange={setActiveCategory}>
            <div className="flex justify-between items-center flex-wrap gap-4 py-4">
                <TabsList>
                    <TabsTrigger value="all">Todos</TabsTrigger>
                    <TabsTrigger value="Ingrediente">Ingredientes</TabsTrigger>
                    <TabsTrigger value="Material">Materiais</TabsTrigger>
                    <TabsTrigger value="Consumo">Consumos</TabsTrigger>
                </TabsList>
                <Input
                    placeholder="Pesquisar no estoque..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-sm"
                />
            </div>
            <div className="w-full overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Preço</TableHead>
                    <TableHead>Peso/Qtd.</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Última Atualização</TableHead>
                    <TableHead className="text-center w-[120px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={7}><Skeleton className="h-5 w-full" /></TableCell>
                      </TableRow>
                    ))
                  ) : filteredStockItems && filteredStockItems.length > 0 ? (
                    filteredStockItems.sort((a,b) => (a.nome > b.nome) ? 1 : -1).map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.nome}</TableCell>
                        <TableCell>{formatCurrency(item.preco)}</TableCell>
                        <TableCell>{item.peso}</TableCell>
                        <TableCell>{item.unidade}</TableCell>
                        <TableCell>{item.categoria}</TableCell>
                        <TableCell>{formatDate(item.dataAtualizacao)}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button variant="ghost" size="icon" onClick={() => openFormForEdit(item)} aria-label="Editar item">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} aria-label="Remover item">
                                <Trash2 className="h-4 w-4 text-destructive/80 hover:text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground h-24">
                         {searchTerm ? "Nenhum item encontrado com esse nome." : "Nenhum item no estoque. Adicione um para começar."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
        </Tabs>
      </CardContent>
    </Card>
  )
}
