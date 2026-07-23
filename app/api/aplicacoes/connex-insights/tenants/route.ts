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
