export const runtime = "nodejs";

import { checkAuth } from "@/lib/auth/require-auth";
import { createClient } from "@/lib/server";
import { createConnexInsightsAdminClient } from "@/lib/integrations/connex-insights/admin-client";
import { ConnexInsightsRemoteRepository } from "@/lib/repositories/connex-insights-remote.repository";
import { ConnexInsightsTenantsService } from "@/lib/services/connex-insights-tenants.service";
import { ok, unauthorized, badGateway } from "@/lib/api/response";

export async function GET() {
  const auth = await checkAuth();
  if (!auth.ok) {
    return unauthorized();
  }

  try {
    const supabase = await createClient();
    const admin = createConnexInsightsAdminClient();
    // Total de tenants = total de clientes cadastrados no CRM (/clientes).
    const [totalUsers, totalTenants] = await Promise.all([
      ConnexInsightsRemoteRepository.countUsers(admin),
      ConnexInsightsTenantsService.count(supabase),
    ]);

    return ok({ totalUsers, totalTenants });
  } catch (err) {
    console.error("[GET /api/aplicacoes/connex-insights/dashboard]", err);
    return badGateway();
  }
}
