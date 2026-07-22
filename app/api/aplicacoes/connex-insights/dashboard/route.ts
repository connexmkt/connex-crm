/**
 * GET /api/aplicacoes/connex-insights/dashboard
 *
 * Retorna a quantidade total de usuários e de tenants cadastrados na
 * Connex Insights (FR-005, FR-006). Somente Admin do CRM (SEC-002).
 *
 * Response 200: { data: { totalUsers: number, totalTenants: number } }
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
    const [totalUsers, totalTenants] = await Promise.all([
      ConnexInsightsRemoteRepository.countUsers(admin),
      ConnexInsightsRemoteRepository.countTenants(admin),
    ]);

    return ok({ totalUsers, totalTenants });
  } catch (err) {
    console.error("[GET /api/aplicacoes/connex-insights/dashboard]", err);
    return badGateway();
  }
}
