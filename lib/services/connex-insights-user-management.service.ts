import { InsightsUserManagementActionsRepository } from "@/lib/repositories/insights-user-management-actions.repository";
import { ConnexInsightsRemoteRepository } from "@/lib/repositories/connex-insights-remote.repository";
import { AuditLogRepository } from "@/lib/repositories/audit-log.repository";
import { createConnexInsightsAdminClient } from "@/lib/integrations/connex-insights/admin-client";
import { generateTemporaryPassword } from "@/lib/utils/generate-temporary-password";
import { toErrorMessage } from "@/lib/utils/db-errors";
import { logProvisioningEvent } from "@/lib/logging/connex-insights-provisioning-logger";
import type { SupabaseClient } from "@supabase/supabase-js";

export type UserActionOutcome =
  | { status: "SUCCEEDED" }
  | { status: "NOT_FOUND" }
  | { status: "INVALID_STATE" }
  | { status: "FAILED_ERROR" };

/** `deactivateUser` é idempotente a partir de qualquer status — nunca
 * produz `INVALID_STATE` (só `reactivateUser` valida a transição). */
export type DeactivateOutcome = Exclude<
  UserActionOutcome,
  { status: "INVALID_STATE" }
>;

export type ResetPasswordOutcome =
  | { status: "SUCCEEDED"; temporaryPassword: string }
  | { status: "NOT_FOUND" }
  | { status: "FAILED_ERROR" };

export type UserManagementContext = {
  requestedByProfileId: string;
  requestId: string;
};

/**
 * Orquestra as ações de gerenciamento (inativar/reativar/resetar senha) de
 * um usuário do Connex Insights via CRM — espelha a estrutura de
 * `connex-insights-provisioning.service.ts`: registra `PENDING` antes de
 * qualquer chamada externa, executa a mudança no Connex Insights e finaliza
 * com `SUCCEEDED`/`FAILED_ERROR` + auditoria (`audit_log`).
 */
export const ConnexInsightsUserManagementService = {
  async deactivateUser(
    userId: string,
    context: UserManagementContext,
    crmSupabase: SupabaseClient,
  ): Promise<DeactivateOutcome> {
    const outcome = await runAction({
      userId,
      context,
      crmSupabase,
      endpoint: `/api/aplicacoes/connex-insights/usuarios/${userId}/desativar`,
      actionType: "DEACTIVATE",
      auditAction: "DEACTIVATE_CONNEX_INSIGHTS_USER",
      validate: () => null,
      execute: (admin) =>
        ConnexInsightsRemoteRepository.setUserStatus(
          admin,
          userId,
          "SUSPENDED",
        ),
    });
    // `validate` acima nunca retorna "INVALID_STATE" — cast seguro.
    return outcome as DeactivateOutcome;
  },

  /** Reativa o usuário (`status = ACTIVE`), mantendo a senha atual — só
   * permitido a partir de `SUSPENDED` (evita pular a troca de senha
   * obrigatória de um usuário ainda `INACTIVE`). */
  async reactivateUser(
    userId: string,
    context: UserManagementContext,
    crmSupabase: SupabaseClient,
  ): Promise<UserActionOutcome> {
    return runAction({
      userId,
      context,
      crmSupabase,
      endpoint: `/api/aplicacoes/connex-insights/usuarios/${userId}/reativar`,
      actionType: "REACTIVATE",
      auditAction: "REACTIVATE_CONNEX_INSIGHTS_USER",
      validate: (currentStatus) =>
        currentStatus !== "SUSPENDED" ? "INVALID_STATE" : null,
      execute: (admin) =>
        ConnexInsightsRemoteRepository.setUserStatus(admin, userId, "ACTIVE"),
    });
  },

  /** Gera uma nova senha temporária e força `status = INACTIVE`,
   * reaproveitando o fluxo `/ativar-conta` já existente — idempotente,
   * funciona a partir de qualquer status. Retorna a senha uma única vez. */
  async resetPassword(
    userId: string,
    context: UserManagementContext,
    crmSupabase: SupabaseClient,
  ): Promise<ResetPasswordOutcome> {
    const startedAt = Date.now();
    const admin = createConnexInsightsAdminClient();

    const user = await ConnexInsightsRemoteRepository.getUserById(
      admin,
      userId,
    );
    if (!user) return { status: "NOT_FOUND" };

    const pending = await InsightsUserManagementActionsRepository.createPending(
      {
        requestedByProfileId: context.requestedByProfileId,
        insightsUserId: userId,
        actionType: "RESET_PASSWORD",
        previousStatus: user.status,
      },
    );

    const temporaryPassword = generateTemporaryPassword();
    let outcome: ResetPasswordOutcome;

    try {
      await ConnexInsightsRemoteRepository.resetUserPassword(
        admin,
        userId,
        temporaryPassword,
      );
      await InsightsUserManagementActionsRepository.markSucceeded(pending.id, {
        temporaryPasswordIssued: true,
      });
      outcome = { status: "SUCCEEDED", temporaryPassword };
    } catch (err) {
      await InsightsUserManagementActionsRepository.markFailed(
        pending.id,
        toErrorMessage(err),
      );
      outcome = { status: "FAILED_ERROR" };
    }

    logProvisioningEvent({
      endpoint: `/api/aplicacoes/connex-insights/usuarios/${userId}/resetar-senha`,
      method: "POST",
      requestId: context.requestId,
      userId: context.requestedByProfileId,
      durationMs: Date.now() - startedAt,
      success: outcome.status === "SUCCEEDED",
      status: outcome.status,
    });

    if (outcome.status === "SUCCEEDED") {
      // Nunca inclui a senha no audit_log — mesma regra de
      // connex-insights-provisioning-logger (Principle IX).
      await AuditLogRepository.record(crmSupabase, {
        actorProfileId: context.requestedByProfileId,
        action: "RESET_CONNEX_INSIGHTS_USER_PASSWORD",
        entityType: "connex_insights_profile",
        entityId: userId,
      }).catch((err) => {
        console.error(
          "[audit_log] falha ao registrar RESET_CONNEX_INSIGHTS_USER_PASSWORD",
          err,
        );
      });
    }

    return outcome;
  },
};

type ActionType = "DEACTIVATE" | "REACTIVATE";

async function runAction(params: {
  userId: string;
  context: UserManagementContext;
  crmSupabase: SupabaseClient;
  endpoint: string;
  actionType: ActionType;
  auditAction: string;
  validate: (currentStatus: string) => "INVALID_STATE" | null;
  execute: (admin: SupabaseClient) => Promise<void>;
}): Promise<UserActionOutcome> {
  const startedAt = Date.now();
  const admin = createConnexInsightsAdminClient();

  const user = await ConnexInsightsRemoteRepository.getUserById(
    admin,
    params.userId,
  );
  if (!user) return { status: "NOT_FOUND" };

  const invalidState = params.validate(user.status);
  if (invalidState) return { status: invalidState };

  const pending = await InsightsUserManagementActionsRepository.createPending({
    requestedByProfileId: params.context.requestedByProfileId,
    insightsUserId: params.userId,
    actionType: params.actionType,
    previousStatus: user.status,
  });

  let outcome: UserActionOutcome;
  try {
    await params.execute(admin);
    await InsightsUserManagementActionsRepository.markSucceeded(pending.id);
    outcome = { status: "SUCCEEDED" };
  } catch (err) {
    await InsightsUserManagementActionsRepository.markFailed(
      pending.id,
      toErrorMessage(err),
    );
    outcome = { status: "FAILED_ERROR" };
  }

  logProvisioningEvent({
    endpoint: params.endpoint,
    method: "POST",
    requestId: params.context.requestId,
    userId: params.context.requestedByProfileId,
    durationMs: Date.now() - startedAt,
    success: outcome.status === "SUCCEEDED",
    status: outcome.status,
  });

  if (outcome.status === "SUCCEEDED") {
    await AuditLogRepository.record(params.crmSupabase, {
      actorProfileId: params.context.requestedByProfileId,
      action: params.auditAction,
      entityType: "connex_insights_profile",
      entityId: params.userId,
    }).catch((err) => {
      console.error(
        `[audit_log] falha ao registrar ${params.auditAction}`,
        err,
      );
    });
  }

  return outcome;
}
