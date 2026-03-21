import type { Timestamp } from 'firebase/firestore';

// From /estoque
export type Unidade = 'MG' | 'G' | 'KG' | 'ML' | 'L' | 'UN';

export type StockItem = {
  id: string;
  nome: string;
  preco: number;
  peso: number;
  unidade: Unidade;
};

// Embedded in recipes
export type RecipeIngredient = {
  stockItemId: string;
  nome: string; // Denormalized name for easier display
  quantidadeUsada: number;
};

// From /receitas_massa
export type DoughRecipe = {
  id: string;
  nome: string;
  ingredientes: RecipeIngredient[];
  rendimento: number; // peso total em gramas
  custoTotal: number;
  dataCriacao?: Timestamp;
};

// From /receitas_recheio
export type FillingRecipe = {
  id: string;
  nome: string;
  ingredientes: RecipeIngredient[];
  rendimento: number; // peso total em gramas
  custoTotal: number;
  dataCriacao?: Timestamp;
};

// Item selecionado no produto final (massa ou recheio) com quantidade em gramas
export type SelectedRecipeItem = {
  id: string;       // ID da receita
  gramas: string;   // Quantidade usada em gramas (string para compatibilidade com Input)
};

// From /produtos_finais
export type FinalProduct = {
  id: string;
  nome: string;

  // Suporte a múltiplas massas
  massas?: SelectedRecipeItem[];   // array de massas selecionadas
  nomeMassa: string;               // nomes concatenados para exibição (ex: "Massa Brownie, Massa Ninho")

  // Suporte a múltiplos recheios
  recheios?: SelectedRecipeItem[]; // array de recheios selecionados
  nomeRecheio: string | null;      // nomes concatenados para exibição

  // Campos legados mantidos para compatibilidade com produtos já salvos no Firestore
  massaId?: string;
  recheioId?: string | null;

  materialPercentage?: number;
  consumoPercentage?: number;
  quantidadeFinal: number;
  custoTotal: number;
  custoUnitario: number;
  dataCriacao?: Timestamp;
};
