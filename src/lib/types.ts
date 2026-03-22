import type { Timestamp } from 'firebase/firestore';

export type Unidade = 'MG' | 'G' | 'KG' | 'ML' | 'L' | 'UN';

export type StockItem = {
  id: string;
  nome: string;
  preco: number;
  peso: number;
  unidade: Unidade;
  categoria?: 'Ingrediente' | 'Material' | 'Consumo';
  dataAtualizacao?: Timestamp;
};

export type RecipeIngredient = {
  stockItemId: string;
  nome: string;
  quantidadeUsada: number;
};

export type DoughRecipe = {
  id: string;
  nome: string;
  ingredientes: RecipeIngredient[];
  rendimento: number;
  custoTotal: number;
  dataCriacao?: Timestamp;
};

export type FillingRecipe = {
  id: string;
  nome: string;
  ingredientes: RecipeIngredient[];
  rendimento: number;
  custoTotal: number;
  dataCriacao?: Timestamp;
};

export type SelectedRecipeItem = {
  id: string;
  gramas: string;
};

export type FinalProduct = {
  id: string;
  nome: string;

  // Múltiplas massas/recheios
  massas?: SelectedRecipeItem[];
  nomeMassa: string;
  recheios?: SelectedRecipeItem[];
  nomeRecheio: string | null;

  // Campos legados (compatibilidade)
  massaId?: string;
  recheioId?: string | null;

  // Custos adicionais
  materialPercentage?: number;
  consumoPercentage?: number;
  maoDeObra?: number;       // valor fixo em R$ por unidade

  // Precificação
  margemLucro?: number;     // % de margem
  precoVenda?: number;      // preço de venda sugerido

  quantidadeFinal: number;
  custoTotal: number;
  custoUnitario: number;
  dataCriacao?: Timestamp;
};