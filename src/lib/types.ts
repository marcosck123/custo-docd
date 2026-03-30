import type { Timestamp } from 'firebase/firestore';

export type Unidade = 'MG' | 'G' | 'KG' | 'ML' | 'L' | 'UN';
export type EntryMeasure = 'G' | 'KG' | 'ML' | 'L' | 'UN';

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
  tipo?: 'produto_final';

  // Múltiplas massas/recheios
  massas?: SelectedRecipeItem[];
  nomeMassa: string;
  recheios?: SelectedRecipeItem[];
  nomeRecheio: string | null;

  // Campos legados (compatibilidade com produtos salvos no formato antigo)
  massaId?: string;
  recheioId?: string | null;
  pesoMassa?: number;
  pesoRecheio?: number;

  // Custos adicionais
  materialPercentage?: number;
  consumoPercentage?: number;
  custoMaoDeObra: number;        // Novo: custo mão de obra em R$
  lucroPercentual: number;       // Novo: percentual de lucro desejado

  // Precificação completa (3 cenários)
  margemLucro?: number;     // legado
  precoVenda?: number;      // legado
  margemMinima?: number;
  margemIdeal?: number;
  margemVenda?: number;
  precoMinimo?: number;
  precoIdeal?: number;
  precoSugerido?: number;   // Novo: preço sugerido calculado

  quantidadeFinal: number;
  custoTotal: number;
  custoUnitario: number;
  dataCriacao?: Timestamp;
};

export type Platform = {
  id: string;
  nome: string;
  cobraTaxa: boolean;
  taxa: number;
  isApp?: boolean;              // Novo: indica se é aplicativo de delivery
  comissaoMensal?: number;      // Novo: comissão mensal para aplicativos
};

export type Market = {
  id: string;
  nome: string;
};

export type SaleRecord = {
  id: string;
  data: string;
  produto: string;
  plataforma: string;
  taxaAplicada: number;
  precoVenda: number;
  valorFinal: number;
};

export type StockEntryRecord = {
  id: string;
  data: string;
  produto: string;
  mercado: string;
  valorPago: number;
  medida: EntryMeasure | '';
  quantidade: number | null;
};

export type WalletPocket = 'banco' | 'caixa';

export type WalletTransaction = {
  id: string;
  tipo: 'entrada' | 'saida';
  categoria: string;
  descricao: string;
  valor: number;
  bolso: WalletPocket;
  data: string;
};

export type WalletData = {
  banco: number;
  caixa: number;
  transacoes: WalletTransaction[];
};

export type CardInfo = {
  nomeNegocio: string;
  responsavel: string;
  documento: string;
  telefone: string;
  observacoes: string;
};

export type VendaPendente = {
  totalBruto: number;
  comissao: number; // Percentual
  totalComissao: number;
  totalLiquido: number;
  vendasIds: string[];
};

export type VendasPendentesApps = {
  [platformId: string]: VendaPendente;
};
