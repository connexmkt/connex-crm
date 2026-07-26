/**
 * Parseia um parâmetro de paginação (`page`/`limit`) recebido como string de
 * query string, garantindo um inteiro positivo — nunca `NaN`/negativo/zero.
 * Usado por todas as listagens paginadas desta feature (FR-026).
 */
export function parsePaginationParam(
  value: string | string[] | undefined,
  fallback: number,
): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(raw ?? "", 10);

  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return parsed;
}
