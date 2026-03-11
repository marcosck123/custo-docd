import type { Timestamp } from 'firebase/firestore';

// From /estoque
export type StockItem = {
  id: string;
  nome: string;
  preco: number;
  peso: number;
  unidade: string;
  dataAtualizacao?: Timestamp;
};

// Embedded in recipes
export type RecipeIngredient = {
  stockItemId: string;
  nome: string; // Denormalized name for easier display
  quantidadeUsada: number;
  // The unit of the stock item is used for cost calculation
};

// From /receitas_massa
export type DoughRecipe = {
  id: string;
  nome: string;
  ingredientes: RecipeIngredient[];
  rendimento: number; // e.g., 10 units
  custoTotal: number;
  dataCriacao?: Timestamp;
};

// From /receitas_recheio
export type FillingRecipe = {
  id: string;
  nome: string;
  ingredientes: RecipeIngredient[];
  custoTotal: number;
  dataCriacao?: Timestamp;
};

// From /produtos_finais
export type FinalProduct = {
  id: string;
  nome: string;
  massaId: string;
  nomeMassa: string;
  recheioId: string | null;
  nomeRecheio: string | null;
  quantidadeFinal: number; // e.g., 10 portions from the dough
  custoTotal: number;
  custoUnitario: number;
  dataCriacao?: Timestamp;
};
