"use client";

import { useCallback, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  ConnexInsightsTenant,
} from "@/lib/repositories/connex-insights-remote.repository";
import { DashboardStats } from "./components/DashboardStats";
import { UsersTable } from "./components/UsersTable";
import { CreateUserDialog } from "./components/CreateUserDialog";
import { CreateUserSuccessModal } from "./components/CreateUserSuccessModal";
import { useConnexInsightsUsers, type UsersPage } from "./hooks/useConnexInsightsUsers";

interface ConnexInsightsPageClientProps {
  initialDashboard: { totalUsers: number; totalTenants: number } | null;
  initialUsers: UsersPage;
  tenants: ConnexInsightsTenant[];
  loadError: boolean;
}

export function ConnexInsightsPageClient({
  initialDashboard,
  initialUsers,
  tenants,
  loadError,
}: ConnexInsightsPageClientProps) {
  const [dashboard, setDashboard] = useState(initialDashboard);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [successPassword, setSuccessPassword] = useState<string | null>(null);
  const usersQuery = useConnexInsightsUsers(initialUsers);

  const refreshDashboard = useCallback(async () => {
    try {
      const res = await fetch("/api/aplicacoes/connex-insights/dashboard");
      if (!res.ok) return;
      const json = (await res.json()) as { data: { totalUsers: number; totalTenants: number } };
      setDashboard(json.data);
    } catch {
      // Mantém o último valor conhecido — indicador não crítico.
    }
  }, []);

  function handleCreated(temporaryPassword: string) {
    setDialogOpen(false);
    setSuccessPassword(temporaryPassword);
    usersQuery.refetch();
    refreshDashboard();
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {loadError && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
        >
          Não foi possível carregar os dados do Connex Insights agora. Atualize a página para
          tentar novamente.
        </div>
      )}

      <DashboardStats
        totalUsers={dashboard?.totalUsers}
        totalTenants={dashboard?.totalTenants}
        loadError={loadError}
      />

      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold">Usuários</h2>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Criar usuário
        </Button>
      </div>

      <UsersTable
        items={usersQuery.items}
        total={usersQuery.total}
        page={usersQuery.page}
        limit={usersQuery.limit}
        isLoading={usersQuery.isLoading}
        onPageChange={usersQuery.fetchPage}
      />

      <CreateUserDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        tenants={tenants}
        onCreated={handleCreated}
      />

      <CreateUserSuccessModal
        temporaryPassword={successPassword}
        onClose={() => setSuccessPassword(null)}
      />
    </div>
  );
}
