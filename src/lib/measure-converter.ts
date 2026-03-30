/**
 * Utilitários para conversão de medidas para gramas
 */

/**
 * Converte uma quantidade de uma medida para gramas
 * Retorna null se a medida for "unidade" (não conversível)
 */
export function converterParaGramas(quantidade: number, medida: string): number | null {
  switch (medida.toUpperCase()) {
    case 'KG':
      return quantidade * 1000;
    case 'G':
      return quantidade;
    case 'L':
      return quantidade * 1000; // 1L ≈ 1000g (para líquidos densos)
    case 'ML':
      return quantidade; // 1ml ≈ 1g (aproximação)
    case 'UN':
    case 'UNIDADE':
      return null; // unidades não convertem para gramas
    default:
      return quantidade;
  }
}

/**
 * Formata a exibição de uma medida em gramas
 * Se for unidade, exibe como "X unidades"
 * Caso contrário, exibe como "Xg"
 */
export function formatarMedidaEmGramas(quantidade: number, medida: string): string {
  const gramas = converterParaGramas(quantidade, medida);
  
  if (gramas === null) {
    // É unidade, não conversível
    return `${Math.round(quantidade)} unidade${quantidade !== 1 ? 's' : ''}`;
  }
  
  // Converter para inteiro quando possível
  const gramasArredondadas = Math.round(gramas);
  return `${gramasArredondadas}g`;
}
