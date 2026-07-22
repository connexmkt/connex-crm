/**
 * Logger estruturado da feature de provisionamento de usuários do Connex
 * Insights (Principle IX). Nunca inclui a senha temporária no log, mesmo
 * que passada por engano ao helper — ver testes em
 * tests/unit/connex-insights-provisioning-logger.test.ts (T060).
 */

export interface ProvisioningLogContext {
  userId?: string;
  endpoint: string;
  method: string;
  requestId: string;
  durationMs: number;
  success: boolean;
  errorMessage?: string;
  [key: string]: unknown;
}

const SENSITIVE_KEY_FRAGMENTS = ["password", "senha"];

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();
  return SENSITIVE_KEY_FRAGMENTS.some((fragment) => lower.includes(fragment));
}

function sanitize(context: Record<string, unknown>): Record<string, unknown> {
  const safe: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(context)) {
    if (isSensitiveKey(key)) continue;
    safe[key] = value;
  }

  return safe;
}

export function logProvisioningEvent(context: ProvisioningLogContext): void {
  const safeContext = sanitize(context);
  const payload = JSON.stringify({
    scope: "connex-insights-provisioning",
    ...safeContext,
  });

  if (context.success) {
    console.log(payload);
  } else {
    console.error(payload);
  }
}
