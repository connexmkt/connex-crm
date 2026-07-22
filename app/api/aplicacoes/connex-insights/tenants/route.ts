/**
 * GET /api/aplicacoes/connex-insights/tenants
 *
 * Lista todos os tenants existentes na Connex Insights, para popular o
 * seletor do formulário de criação de usuário (FR-011). Somente Admin do
 * CRM (SEC-002).
 *
 * Response 200: { data: { items: Array<{ id: string, name: string }> } }
 * Response 401: Unauthorized
 * Response 403: Forbidden
 * Response 502: Connex Insights indisponível
 */

export const runtime = "nodejs";

import { checkAdmin } from "@/lib/auth/require-admin";
import { createConnexInsightsAdminClient } from "@/lib/integrations/connex-insights/admin-client";
import { ConnexInsightsRemoteRepository } from "@/lib/repositories/connex-insights-remote.repository";
import { ok, unauthorized, forbidden, badGateway } from "@/lib/api/response";

export async function GET() {
  const auth = await checkAdmin();
  if (!auth.ok) {
    return auth.reason === "unauthenticated" ? unauthorized() : forbidden();
  }

  try {
    const admin = createConnexInsightsAdminClient();
    const items = await ConnexInsightsRemoteRepository.listTenants(admin);
    return ok({ items });
  } catch (err) {
    console.error("[GET /api/aplicacoes/connex-insights/tenants]", err);
    return badGateway();
  }
}
