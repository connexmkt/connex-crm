"use client";

import { useCallback, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ConnexInsightsTenantOption } from "@/lib/services/connex-insights-tenants.service";
import type { ConnexInsightsUserRow } from "@/lib/repositories/connex-insights-remote.repository";
import { DashboardStats } from "./components/DashboardStats";
import { UsersTable } from "./components/UsersTable";
import { CreateUserDialog } from "./components/CreateUserDialog";
import { ConfirmActionDialog } from "./components/ConfirmActionDialog";
import { TemporaryPasswordModal } from "./components/TemporaryPasswordModal";
import {
  useConnexInsightsUsers,
  type UsersPage,
} from "./hooks/useConnexInsightsUsers";

interface ConnexInsightsPageClientProps {
  initialDashboard: { totalUsers: number; totalTenants: number } | null;
  initialUsers: UsersPage;
  tenants: ConnexInsightsTenantOption[];
  loadError: boolean;
}

type ConfirmDialogAction = "deactivate" | "reactivate";

type ConfirmDialogState = {
  user: ConnexInsightsUserRow;
  action: ConfirmDialogAction;
} | null;

type PasswordModalState = {
  password: string;
  title: string;
  description: string;
} | null;

/**
 * Mensagens amigáveis para os 3 novos endpoints de gerenciamento de usuário
 * (desativar/reativar/resetar-senha) — mesmo espírito de
 * `getCreateUserErrorMessage` (`CreateUserErrorModal.tsx`), porém com
 * mensagens específicas dessas ações (409 só ocorre em "reativar").
 */
const USER_ACTION_ERROR_MESSAGES: Record<number, string> = {
  401: "Sua sessão expirou. Faça login novamente.",
  404: "Usuário não encontrado. Atualize a lista e tente novamente.",
  409: "Usuário não está inativado. Atualize a lista e tente novamente.",
  502: "Não foi possível concluir a ação no momento. Tente novamente em instantes.",
};
const DEFAULT_USER_ACTION_ERROR_MESSAGE =
  "Não foi possível concluir a ação no momento. Tente novamente em instantes.";

function getUserActionErrorMessage(status: number): string {
  return (
    USER_ACTION_ERROR_MESSAGES[status] ?? DEFAULT_USER_ACTION_ERROR_MESSAGE
  );
}

export function ConnexInsightsPageClient({
  initialDashboard,
  initialUsers,
  tenants,
  loadError,
}: ConnexInsightsPageClientProps) {
  const [dashboard, setDashboard] = useState(initialDashboard);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [passwordModal, setPasswordModal] = useState<PasswordModalState>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [actionUserId, setActionUserId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const usersQuery = useConnexInsightsUsers(initialUsers);

  const refreshDashboard = useCallback(async () => {
    try {
      const res = await fetch("/api/aplicacoes/connex-insights/dashboard");
      if (!res.ok) return;
      const json = (await res.json()) as {
        data: { totalUsers: number; totalTenants: number };
      };
      setDashboard(json.data);
    } catch {
      // Mantém o último valor conhecido — indicador não crítico.
    }
  }, []);

  function handleCreated(temporaryPassword: string) {
    setDialogOpen(false);
    setPasswordModal({
      password: temporaryPassword,
      title: "Usuário criado com sucesso",
      description:
        "Compartilhe a senha temporária abaixo com o usuário — ela será exibida apenas desta vez e será exigida na primeira ativação de conta no Connex Insights.",
    });
    usersQuery.refetch();
    refreshDashboard();
  }

  function handleDeactivateRequest(user: ConnexInsightsUserRow) {
    setActionError(null);
    setConfirmDialog({ user, action: "deactivate" });
  }

  function handleReactivateRequest(user: ConnexInsightsUserRow) {
    setActionError(null);
    setConfirmDialog({ user, action: "reactivate" });
  }

  async function handleConfirmAction() {
    if (!confirmDialog || isConfirming) return;
    const { user, action } = confirmDialog;
    const endpoint = action === "deactivate" ? "desativar" : "reativar";

    setIsConfirming(true);
    try {
      const res = await fetch(
        `/api/aplicacoes/connex-insights/usuarios/${user.id}/${endpoint}`,
        {
          method: "POST",
        },
      );

      if (!res.ok) {
        setActionError(getUserActionErrorMessage(res.status));
        return;
      }

      setConfirmDialog(null);
      usersQuery.refetch();
    } catch {
      setActionError(getUserActionErrorMessage(502));
    } finally {
      setIsConfirming(false);
    }
  }

  async function handleResetPassword(user: ConnexInsightsUserRow) {
    if (actionUserId) return;
    setActionError(null);
    setActionUserId(user.id);

    try {
      const res = await fetch(
        `/api/aplicacoes/connex-insights/usuarios/${user.id}/resetar-senha`,
        {
          method: "POST",
        },
      );
      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setActionError(getUserActionErrorMessage(res.status));
        return;
      }

      setPasswordModal({
        password: json?.data?.temporaryPassword ?? "",
        title: "Senha redefinida com sucesso",
        description:
          "Compartilhe a nova senha temporária abaixo com o usuário — ela será exibida apenas desta vez e será exigida na próxima ativação de conta no Connex Insights.",
      });
      usersQuery.refetch();
    } catch {
      setActionError(getUserActionErrorMessage(502));
    } finally {
      setActionUserId(null);
    }
  }

  const confirmDialogCopy =
    confirmDialog?.action === "deactivate"
      ? {
          title: "Inativar usuário",
          description: `Tem certeza que deseja inativar o acesso de ${confirmDialog.user.displayName}? O usuário não conseguirá mais fazer login no Connex Insights até ser reativado.`,
          confirmLabel: "Inativar",
          variant: "destructive" as const,
        }
      : confirmDialog?.action === "reactivate"
        ? {
            title: "Reativar usuário",
            description: `Tem certeza que deseja reativar o acesso de ${confirmDialog.user.displayName}? O usuário poderá fazer login novamente com a senha atual.`,
            confirmLabel: "Reativar",
            variant: "default" as const,
          }
        : null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {loadError && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
        >
          Não foi possível carregar os dados do Connex Insights agora. Atualize
          a página para tentar novamente.
        </div>
      )}

      {actionError && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
        >
          {actionError}
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
          Criar acesso
        </Button>
      </div>

      <UsersTable
        items={usersQuery.items}
        total={usersQuery.total}
        page={usersQuery.page}
        limit={usersQuery.limit}
        isLoading={usersQuery.isLoading}
        onPageChange={usersQuery.fetchPage}
        onDeactivate={handleDeactivateRequest}
        onReactivate={handleReactivateRequest}
        onResetPassword={handleResetPassword}
        actionInProgressUserId={actionUserId}
      />

      <CreateUserDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        tenants={tenants}
        onCreated={handleCreated}
      />

      <TemporaryPasswordModal
        temporaryPassword={passwordModal?.password ?? null}
        title={passwordModal?.title ?? ""}
        description={passwordModal?.description ?? ""}
        onClose={() => setPasswordModal(null)}
      />

      {confirmDialogCopy && (
        <ConfirmActionDialog
          open={confirmDialog !== null}
          onOpenChange={(open) =>
            !open && !isConfirming && setConfirmDialog(null)
          }
          title={confirmDialogCopy.title}
          description={confirmDialogCopy.description}
          confirmLabel={confirmDialogCopy.confirmLabel}
          variant={confirmDialogCopy.variant}
          isConfirming={isConfirming}
          onConfirm={handleConfirmAction}
        />
      )}
    </div>
  );
}
