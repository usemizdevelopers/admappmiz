const formatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

/** Recebe valor em reais (número) e devolve "R$ 1.234,56". */
export function formatBRL(valorReais: number): string {
  return formatter.format(valorReais);
}

/** Recebe só os dígitos digitados (centavos) e devolve "1.234,56" pronto pra exibir no input. */
export function centavosParaExibicao(centavos: number): string {
  return (centavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
