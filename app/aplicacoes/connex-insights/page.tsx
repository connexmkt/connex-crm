import { requireAuthOrRedirect } from "@/lib/auth/require-auth";
import { AppShell } from "@/components/layout";
import { createClient } from "@/lib/server";
import { createConnexInsightsAdminClient } from "@/lib/integrations/connex-insights/admin-client";
import { ConnexInsightsRemoteRepository } from "@/lib/repositories/connex-insights-remote.repository";
import { ConnexInsightsTenantsService } from "@/lib/services/connex-insights-tenants.service";
import { ConnexInsightsPageClient } from "./ConnexInsightsPageClient";
import type { UsersPage } from "./hooks/useConnexInsightsUsers";

const PAGE_SIZE = 20;
const EMPTY_USERS_PAGE: UsersPage = { items: [], total: 0, page: 1, limit: PAGE_SIZE };

export default async function ConnexInsightsAplicacaoPage() {
  await requireAuthOrRedirect();

  try {
    const supabase = await createClient();
    const admin = createConnexInsightsAdminClient();
    // Os tenants exibidos aqui vêm da lista de clientes do CRM (/clientes),
    // única fonte de verdade — não da tabela remota `tenants`.
    const [totalUsers, totalTenants, usersPage, tenants] = await Promise.all([
      ConnexInsightsRemoteRepository.countUsers(admin),
      ConnexInsightsTenantsService.count(supabase),
      ConnexInsightsRemoteRepository.listUsers(admin, 1, PAGE_SIZE),
      ConnexInsightsTenantsService.listAll(supabase),
    ]);

    return (
      <AppShell title="Connex Insights">
        <ConnexInsightsPageClient
          initialDashboard={{ totalUsers, totalTenants }}
          initialUsers={{ ...usersPage, page: 1, limit: PAGE_SIZE }}
          tenants={tenants}
          loadError={false}
        />
      </AppShell>
    );
  } catch (err) {
    console.error("[app/aplicacoes/connex-insights] falha ao carregar dados iniciais", err);

    return (
      <AppShell title="Connex Insights">
        <ConnexInsightsPageClient
          initialDashboard={null}
          initialUsers={EMPTY_USERS_PAGE}
          tenants={[]}
          loadError
        />
      </AppShell>
    );
  }
}
