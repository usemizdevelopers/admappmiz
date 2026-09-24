/**
 * Supabase Storage rejeita chaves de objeto com acentos, espaços e vários
 * símbolos (ex: "Invalid key"). Sanitiza o nome original do arquivo antes de
 * usar no path do Storage, mantendo a extensão.
 */
export function sanitizeFilename(nome: string): string {
  const pontoIdx = nome.lastIndexOf('.');
  const base = pontoIdx > 0 ? nome.slice(0, pontoIdx) : nome;
  const extensao = pontoIdx > 0 ? nome.slice(pontoIdx).toLowerCase() : '';

  const baseLimpa = base
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove acentos (á -> a, ç -> c, ...)
    .replace(/[^a-zA-Z0-9]+/g, '-') // espaço, parênteses, etc. viram hífen
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

  return (baseLimpa || 'arquivo') + extensao;
}
