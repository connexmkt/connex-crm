/**
 * Valida os segmentos de rota `[ano]`/`[mes]`/`[semana]` da navegação
 * hierárquica de relatórios de Instagram — retorna `null` quando o valor não
 * é um inteiro dentro da faixa esperada, para que a página chame `notFound()`.
 */
export function parseYearMonthParams(
  ano: string,
  mes: string,
): { year: number; month: number } | null {
  const year = Number.parseInt(ano, 10);
  const month = Number.parseInt(mes, 10);

  if (!Number.isInteger(year) || year < 2020 || year > 2100) return null;
  if (!Number.isInteger(month) || month < 1 || month > 12) return null;

  return { year, month };
}

export function parseWeekParam(semana: string): number | null {
  const week = Number.parseInt(semana, 10);
  if (!Number.isInteger(week) || week < 1 || week > 5) return null;
  return week;
}
