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
import { PlusCircle, Save, XCircle, Trash2, Edit } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, serverTimestamp } from 'firebase/firestore';
import { addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { DoughRecipe, FillingRecipe, FinalProduct } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const formatCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined || isNaN(value) || !isFinite(value)) return "R$ 0,00";
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const calcPrecoVenda = (custo: number, margem: number) => {
  if (margem >= 100 || custo <= 0) return 0;
  if (margem <= 0) return custo;
  return custo / (1 - margem / 100);
};

interface SelectedRecipe {
  id: string;
  gramas: string;
}

export const AdvancedFinalProductManager = () => {
  const { toast } = useToast();
  const firestore = useFirestore();

  const doughRecipesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'receitas_massa') : null, [firestore]);
  const { data: doughRecipes, isLoading: isLoadingDough } = useCollection<DoughRecipe>(doughRecipesQuery);

  const fillingRecipesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'receitas_recheio') : null, [firestore]);
  const { data: fillingRecipes, isLoading: isLoadingFilling } = useCollection<FillingRecipe>(fillingRecipesQuery);

  const productsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'produtos_finais') : null, [firestore]);
  const { data: products, isLoading: isLoadingProducts } = useCollection<FinalProduct>(productsQuery);

  // Estado do formulário
  const [nome, setNome] = useState('');
  const [massasSelecionadas, setMassasSelecionadas] = useState<SelectedRecipe[]>([]);
  const [recheiosSelecionados, setRecheiosSelecionados] = useState<SelectedRecipe[]>([]);
  const [massaSelecionadaId, setMassaSelecionadaId] = useState('');
  const [gramasMassa, setGramasMassa] = useState('');
  const [recheioSelecionadoId, setRecheioSelecionadoId] = useState('');
  const [gramasRecheio, setGramasRecheio] = useState('');
  const [maoDeObra, setMaoDeObra] = useState('0');
  const [lucroPercentual, setLucroPercentual] = useState('30');
  const [quantidadeFinal, setQuantidadeFinal] = useState('1');
  const [editingProduct, setEditingProduct] = useState<FinalProduct | null>(null);
  const [showDialog, setShowDialog] = useState(false);

  // Preenche campos no modo edição
  useEffect(() => {
    if (editingProduct) {
      setNome(editingProduct.nome || '');
      setMassasSelecionadas(editingProduct.massas || []);
      setRecheiosSelecionados(editingProduct.recheios || []);
      setMaoDeObra(String(editingProduct.custoMaoDeObra || 0));
      setLucroPercentual(String(editingProduct.lucroPercentual || 30));
      setQuantidadeFinal(String(editingProduct.quantidadeFinal || 1));
    }
  }, [editingProduct]);

  // Calcula custos totais
  const custoMassas = useMemo(() => {
    return massasSelecionadas.reduce((total, item) => {
      const recipe = doughRecipes?.find(r => r.id === item.id);
      if (!recipe) return total;
      const gramas = parseFloat(item.gramas) || 0;
      const custoPorGrama = recipe.custoTotal / (recipe.rendimento || 1);
      return total + (custoPorGrama * gramas);
    }, 0);
  }, [massasSelecionadas, doughRecipes]);

  const custoRecheios = useMemo(() => {
    return recheiosSelecionados.reduce((total, item) => {
      const recipe = fillingRecipes?.find(r => r.id === item.id);
      if (!recipe) return total;
      const gramas = parseFloat(item.gramas) || 0;
      const custoPorGrama = recipe.custoTotal / (recipe.rendimento || 1);
      return total + (custoPorGrama * gramas);
    }, 0);
  }, [recheiosSelecionados, fillingRecipes]);

  const custoIngredientes = custoMassas + custoRecheios;
  const maoDeObraNum = parseFloat(maoDeObra) || 0;
  const custoTotal = custoIngredientes + maoDeObraNum;
  const lucroNum = parseFloat(lucroPercentual) || 0;
  const precoSugerido = calcPrecoVenda(custoTotal, lucroNum);
  const lucroValor = precoSugerido - custoTotal;

  const handleAdicionarMassa = () => {
    if (!massaSelecionadaId || !gramasMassa) {
      toast({
        title: "Campos incompletos",
        description: "Selecione uma massa e informe a quantidade em gramas.",
        variant: "destructive",
      });
      return;
    }

    setMassasSelecionadas([...massasSelecionadas, { id: massaSelecionadaId, gramas: gramasMassa }]);
    setMassaSelecionadaId('');
    setGramasMassa('');
  };

  const handleAdicionarRecheio = () => {
    if (!recheioSelecionadoId || !gramasRecheio) {
      toast({
        title: "Campos incompletos",
        description: "Selecione um recheio e informe a quantidade em gramas.",
        variant: "destructive",
      });
      return;
    }

    setRecheiosSelecionados([...recheiosSelecionados, { id: recheioSelecionadoId, gramas: gramasRecheio }]);
    setRecheioSelecionadoId('');
    setGramasRecheio('');
  };

  const handleRemoverMassa = (index: number) => {
    setMassasSelecionadas(massasSelecionadas.filter((_, i) => i !== index));
  };

  const handleRemoverRecheio = (index: number) => {
    setRecheiosSelecionados(recheiosSelecionados.filter((_, i) => i !== index));
  };

  const handleSalvar = async () => {
    if (!nome || massasSelecionadas.length === 0) {
      toast({
        title: "Campos incompletos",
        description: "Informe o nome do produto e adicione pelo menos uma massa.",
        variant: "destructive",
      });
      return;
    }

    if (!firestore) return;

    const productData: Partial<FinalProduct> = {
      nome,
      tipo: 'produto_final',
      massas: massasSelecionadas,
      recheios: recheiosSelecionados,
      custoMaoDeObra: maoDeObraNum,
      lucroPercentual: lucroNum,
      custoTotal,
      precoSugerido,
      quantidadeFinal: parseInt(quantidadeFinal) || 1,
      custoUnitario: custoTotal / (parseInt(quantidadeFinal) || 1),
      dataCriacao: serverTimestamp(),
    };

    try {
      if (editingProduct) {
        await updateDocumentNonBlocking(doc(firestore, 'produtos_finais', editingProduct.id), productData);
        toast({
          title: "Produto atualizado!",
          description: `${nome} foi atualizado com sucesso.`,
        });
      } else {
        await addDocumentNonBlocking(collection(firestore, 'produtos_finais'), productData);
        toast({
          title: "Produto criado!",
          description: `${nome} foi adicionado com sucesso.`,
        });
      }

      // Limpa formulário
      setNome('');
      setMassasSelecionadas([]);
      setRecheiosSelecionados([]);
      setMaoDeObra('0');
      setLucroPercentual('30');
      setQuantidadeFinal('1');
      setEditingProduct(null);
      setShowDialog(false);
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Ocorreu um erro ao salvar o produto.",
        variant: "destructive",
      });
    }
  };

  const handleEditar = (product: FinalProduct) => {
    setEditingProduct(product);
    setShowDialog(true);
  };

  const handleDeletar = (id: string) => {
    if (!firestore) return;
    deleteDocumentNonBlocking(doc(firestore, 'produtos_finais', id));
    toast({ title: "Produto deletado!", variant: "destructive" });
  };

  const handleNovoProduct = () => {
    setEditingProduct(null);
    setNome('');
    setMassasSelecionadas([]);
    setRecheiosSelecionados([]);
    setMaoDeObra('0');
    setLucroPercentual('30');
    setQuantidadeFinal('1');
    setShowDialog(true);
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulário */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>{editingProduct ? 'Editar Produto' : 'Novo Produto Final'}</CardTitle>
              <CardDescription>Configure seu produto com múltiplas massas e recheios.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Nome */}
              <div>
                <Label htmlFor="nome">Nome do Produto</Label>
                <Input
                  id="nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Bolo de Chocolate"
                />
              </div>

              {/* Mão de Obra */}
              <div>
                <Label htmlFor="maoDeObra">Mão de Obra (R$)</Label>
                <Input
                  id="maoDeObra"
                  type="number"
                  value={maoDeObra}
                  onChange={(e) => setMaoDeObra(e.target.value)}
                  placeholder="Ex: 15.00"
                  step="0.01"
                />
              </div>

              {/* Lucro Percentual */}
              <div>
                <Label htmlFor="lucro">Lucro Desejado (%)</Label>
                <Input
                  id="lucro"
                  type="number"
                  value={lucroPercentual}
                  onChange={(e) => setLucroPercentual(e.target.value)}
                  placeholder="Ex: 30"
                  step="1"
                />
              </div>

              {/* Quantidade Final */}
              <div>
                <Label htmlFor="quantidade">Quantidade Final (unidades)</Label>
                <Input
                  id="quantidade"
                  type="number"
                  value={quantidadeFinal}
                  onChange={(e) => setQuantidadeFinal(e.target.value)}
                  placeholder="Ex: 1"
                  step="1"
                  min="1"
                />
              </div>

              <Separator />

              {/* Massas */}
              <div className="space-y-2">
                <Label>Massas</Label>
                <div className="space-y-2">
                  <Select value={massaSelecionadaId} onValueChange={setMassaSelecionadaId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma massa" />
                    </SelectTrigger>
                    <SelectContent>
                      {doughRecipes?.map((recipe) => (
                        <SelectItem key={recipe.id} value={recipe.id}>
                          {recipe.nome} ({formatCurrency(recipe.custoTotal)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    value={gramasMassa}
                    onChange={(e) => setGramasMassa(e.target.value)}
                    placeholder="Gramas"
                    step="0.1"
                  />
                  <Button onClick={handleAdicionarMassa} variant="outline" className="w-full">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Adicionar Massa
                  </Button>
                </div>

                {/* Lista de Massas */}
                {massasSelecionadas.length > 0 && (
                  <div className="space-y-1 mt-2">
                    {massasSelecionadas.map((item, idx) => {
                      const recipe = doughRecipes?.find(r => r.id === item.id);
                      return (
                        <div key={idx} className="flex justify-between items-center bg-muted p-2 rounded text-sm">
                          <span>{recipe?.nome} ({item.gramas}g)</span>
                          <Button
                            onClick={() => handleRemoverMassa(idx)}
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Recheios */}
              <div className="space-y-2">
                <Label>Recheios (Opcional)</Label>
                <div className="space-y-2">
                  <Select value={recheioSelecionadoId} onValueChange={setRecheioSelecionadoId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um recheio" />
                    </SelectTrigger>
                    <SelectContent>
                      {fillingRecipes?.map((recipe) => (
                        <SelectItem key={recipe.id} value={recipe.id}>
                          {recipe.nome} ({formatCurrency(recipe.custoTotal)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    value={gramasRecheio}
                    onChange={(e) => setGramasRecheio(e.target.value)}
                    placeholder="Gramas"
                    step="0.1"
                  />
                  <Button onClick={handleAdicionarRecheio} variant="outline" className="w-full">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Adicionar Recheio
                  </Button>
                </div>

                {/* Lista de Recheios */}
                {recheiosSelecionados.length > 0 && (
                  <div className="space-y-1 mt-2">
                    {recheiosSelecionados.map((item, idx) => {
                      const recipe = fillingRecipes?.find(r => r.id === item.id);
                      return (
                        <div key={idx} className="flex justify-between items-center bg-muted p-2 rounded text-sm">
                          <span>{recipe?.nome} ({item.gramas}g)</span>
                          <Button
                            onClick={() => handleRemoverRecheio(idx)}
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <Separator />

              {/* Card de Resumo */}
              <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                <CardContent className="pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">💰 Custo Ingredientes:</span>
                    <span className="font-semibold">{formatCurrency(custoIngredientes)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">🔧 Mão de Obra:</span>
                    <span className="font-semibold">{formatCurrency(maoDeObraNum)}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between text-sm font-semibold">
                    <span>📊 Custo Total:</span>
                    <span>{formatCurrency(custoTotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">📈 Lucro ({lucroNum}%):</span>
                    <span className="font-semibold text-green-600">{formatCurrency(lucroValor)}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between text-sm font-bold">
                    <span>🏷️ Preço Sugerido:</span>
                    <span className="text-primary text-lg">{formatCurrency(precoSugerido)}</span>
                  </div>
                </CardContent>
              </Card>

              <Button onClick={handleSalvar} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                {editingProduct ? 'Atualizar Produto' : 'Salvar Produto'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Produtos */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Produtos Finais Salvos</CardTitle>
                  <CardDescription>Gerencie seus produtos cadastrados.</CardDescription>
                </div>
                <Button onClick={handleNovoProduct}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Novo Produto
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingProducts ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : products && products.length > 0 ? (
                <div className="w-full overflow-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Custo Unit.</TableHead>
                        <TableHead>Mão de Obra</TableHead>
                        <TableHead>Lucro %</TableHead>
                        <TableHead>Preço Sugerido</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium">{product.nome}</TableCell>
                          <TableCell>{formatCurrency(product.custoUnitario)}</TableCell>
                          <TableCell>{formatCurrency(product.custoMaoDeObra)}</TableCell>
                          <TableCell>{product.lucroPercentual}%</TableCell>
                          <TableCell className="text-primary font-semibold">{formatCurrency(product.precoSugerido)}</TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button
                              onClick={() => handleEditar(product)}
                              variant="outline"
                              size="sm"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Deletar Produto</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja deletar "{product.nome}"?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeletar(product.id)}>
                                    Deletar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Nenhum produto criado ainda.</p>
                  <Button onClick={handleNovoProduct} variant="outline" className="mt-4">
                    Criar Primeiro Produto
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};
