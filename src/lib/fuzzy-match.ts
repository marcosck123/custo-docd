/**
 * Utilitários para normalização e detecção de produtos similares (Fuzzy Match)
 */

/**
 * Normaliza uma string para comparação:
 * - Converte para minúsculas
 * - Remove acentos
 * - Remove espaços extras
 */
export function normalizar(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Verifica se o nome digitado tem pelo menos uma palavra em comum com o nome no banco
 * Filtra palavras com menos de 3 caracteres
 */
export function temPalavraEmComum(nomeDigitado: string, nomeNoBanco: string): boolean {
  const palavrasDigitadas = normalizar(nomeDigitado)
    .split(/\s+/)
    .filter(p => p.length > 2);
  
  const nomeBancoNorm = normalizar(nomeNoBanco);
  
  return palavrasDigitadas.some(palavra => nomeBancoNorm.includes(palavra));
}

/**
 * Encontra todos os produtos similares em um array de produtos
 */
export function encontrarProdutosSimilares(
  nomeDigitado: string,
  produtos: Array<{ id: string; nome: string }>
): Array<{ id: string; nome: string }> {
  if (!nomeDigitado.trim()) return [];
  
  return produtos.filter(produto => temPalavraEmComum(nomeDigitado, produto.nome));
}
