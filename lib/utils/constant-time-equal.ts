import { timingSafeEqual } from "node:crypto";

/**
 * Compara duas strings em tempo constante (`crypto.timingSafeEqual`),
 * evitando ataques de timing na validação de segredos compartilhados
 * (ver research.md § D2 — `x-connex-insights-secret`). Buffers de tamanhos
 * diferentes retornam `false` sem chamar `timingSafeEqual` (que lançaria).
 */
export function constantTimeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);

  if (bufferA.length !== bufferB.length) return false;

  return timingSafeEqual(bufferA, bufferB);
}
