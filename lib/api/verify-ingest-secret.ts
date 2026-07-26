import { constantTimeEqual } from "@/lib/utils/constant-time-equal";

/**
 * Valida o header `x-connex-insights-secret` dos Route Handlers de
 * ingestão de relatórios de Instagram contra `CONNEX_INSIGHTS_INGEST_SECRET`,
 * em tempo constante (research.md § D2). Tentativas inválidas são logadas
 * para auditoria de segurança (OBS-002).
 */
export function verifyIngestSecret(request: Request, endpoint: string): boolean {
  const provided = request.headers.get("x-connex-insights-secret");
  const expected = process.env.CONNEX_INSIGHTS_INGEST_SECRET;

  const isValid = Boolean(provided) && Boolean(expected) && constantTimeEqual(provided!, expected!);

  if (!isValid) {
    console.error(
      JSON.stringify({
        scope: "instagram-reports-ingestion-auth",
        endpoint,
        reason: "invalid_ingest_secret",
      }),
    );
  }

  return isValid;
}
