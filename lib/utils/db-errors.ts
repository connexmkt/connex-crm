/** Código de violação de UNIQUE constraint do Prisma. */
const PRISMA_UNIQUE_VIOLATION_CODE = "P2002";
/** Código de violação de UNIQUE constraint do Postgres/PostgREST. */
const POSTGRES_UNIQUE_VIOLATION_CODE = "23505";

/**
 * Detecta violação de UNIQUE constraint tanto em erros do Prisma quanto do
 * Supabase/PostgREST — usado para mapear concorrência (double-click, retry,
 * requisições simultâneas) em 409 Conflict (research.md § D3).
 */
export function isUniqueConstraintError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const code = (err as { code?: unknown }).code;
  return code === PRISMA_UNIQUE_VIOLATION_CODE || code === POSTGRES_UNIQUE_VIOLATION_CODE;
}

/** Extrai uma mensagem de erro segura para logging (nunca expõe ao cliente). */
export function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Erro desconhecido";
}
