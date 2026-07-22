import { requireAdminOrRedirect } from "@/lib/auth/require-admin";
import { AppShell } from "@/components/layout";
import { createConnexInsightsAdminClient } from "@/lib/integrations/connex-insights/admin-client";
import { ConnexInsightsRemoteRepository } from "@/lib/repositories/connex-insights-remote.repository";
import { ConnexInsightsPageClient } from "./ConnexInsightsPageClient";
import type { UsersPage } from "./hooks/useConnexInsightsUsers";

const PAGE_SIZE = 20;
const EMPTY_USERS_PAGE: UsersPage = { items: [], total: 0, page: 1, limit: PAGE_SIZE };

export default async function ConnexInsightsAplicacaoPage() {
  // FR-004 / SEC-002: somente Admin acessa esta página.
  await requireAdminOrRedirect();

  try {
    const admin = createConnexInsightsAdminClient();
    const [totalUsers, totalTenants, usersPage, tenants] = await Promise.all([
      ConnexInsightsRemoteRepository.countUsers(admin),
      ConnexInsightsRemoteRepository.countTenants(admin),
      ConnexInsightsRemoteRepository.listUsers(admin, 1, PAGE_SIZE),
      ConnexInsightsRemoteRepository.listTenants(admin),
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
