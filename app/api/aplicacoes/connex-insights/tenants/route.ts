export const runtime = "nodejs";

import { checkAuth } from "@/lib/auth/require-auth";
import { createClient } from "@/lib/server";
import { ConnexInsightsTenantsService } from "@/lib/services/connex-insights-tenants.service";
import { ok, unauthorized, badGateway } from "@/lib/api/response";

export async function GET() {
  const auth = await checkAuth();
  if (!auth.ok) {
    return unauthorized();
  }

  try {
    // Lista de clientes cadastrados no CRM (/clientes) — única fonte de
    // verdade sobre os tenants do Connex Insights.
    const supabase = await createClient();
    const items = await ConnexInsightsTenantsService.listAll(supabase);
    return ok({ items });
  } catch (err) {
    console.error("[GET /api/aplicacoes/connex-insights/tenants]", err);
    return badGateway();
  }
}
