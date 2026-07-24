import { requireAuthOrRedirect } from "@/lib/auth/require-auth";
import { AppShell } from "@/components/layout";
import { createClient } from "@/lib/server";
import { createConnexInsightsAdminClient } from "@/lib/integrations/connex-insights/admin-client";
import { ConnexInsightsRemoteRepository } from "@/lib/repositories/connex-insights-remote.repository";
import { ConnexInsightsTenantsService } from "@/lib/services/connex-insights-tenants.service";
import { ConnexInsightsPageClient } from "./ConnexInsightsPageClient";
import type { UsersPage } from "./hooks/useConnexInsightsUsers";
import type { ConnexInsightsTenantOption } from "@/lib/services/connex-insights-tenants.service";

const PAGE_SIZE = 20;
const EMPTY_USERS_PAGE: UsersPage = { items: [], total: 0, page: 1, limit: PAGE_SIZE };

export default async function ConnexInsightsAplicacaoPage() {
  await requireAuthOrRedirect();

  let initialDashboard: { totalUsers: number; totalTenants: number } | null = null;
  let initialUsers: UsersPage = EMPTY_USERS_PAGE;
  let tenants: ConnexInsightsTenantOption[] = [];
  let loadError = false;

  try {
    const supabase = await createClient();
    const admin = createConnexInsightsAdminClient();
    // Os tenants exibidos aqui vêm da lista de clientes do CRM (/clientes),
    // única fonte de verdade — não da tabela remota `tenants`.
    const [totalUsers, totalTenants, usersPage, tenantsList] = await Promise.all([
      ConnexInsightsRemoteRepository.countUsers(admin),
      ConnexInsightsTenantsService.count(supabase),
      ConnexInsightsRemoteRepository.listUsers(admin, 1, PAGE_SIZE),
      ConnexInsightsTenantsService.listAll(supabase),
    ]);

    initialDashboard = { totalUsers, totalTenants };
    initialUsers = { ...usersPage, page: 1, limit: PAGE_SIZE };
    tenants = tenantsList;
  } catch (err) {
    console.error("[app/aplicacoes/connex-insights] falha ao carregar dados iniciais", err);
    loadError = true;
  }

  // A construção do JSX fica fora do try/catch: erros de render não são
  // capturados por try/catch e devem ser tratados por um Error Boundary.
  return (
    <AppShell title="Connex Insights">
      <ConnexInsightsPageClient
        initialDashboard={initialDashboard}
        initialUsers={initialUsers}
        tenants={tenants}
        loadError={loadError}
      />
    </AppShell>
  );
}
