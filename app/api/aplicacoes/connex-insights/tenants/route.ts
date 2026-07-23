/**
 * GET /api/aplicacoes/connex-insights/tenants
 *
 * Lista todos os tenants existentes na Connex Insights, para popular o
 * seletor do formulário de criação de usuário (FR-011). Requer usuário
 * autenticado no CRM.
 *
 * Response 200: { data: { items: Array<{ id: string, name: string }> } }
 * Response 401: Unauthorized
 * Response 502: Connex Insights indisponível
 */

export const runtime = "nodejs";

import { checkAuth } from "@/lib/auth/require-auth";
import { createConnexInsightsAdminClient } from "@/lib/integrations/connex-insights/admin-client";
import { ConnexInsightsRemoteRepository } from "@/lib/repositories/connex-insights-remote.repository";
import { ok, unauthorized, badGateway } from "@/lib/api/response";

export async function GET() {
  const auth = await checkAuth();
  if (!auth.ok) {
    return unauthorized();
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
