import type { SupabaseClient } from "@supabase/supabase-js";
import type { CriarUsuarioInput } from "@/app/aplicacoes/schemas/criar-usuario.schema";
import { InsightsProvisioningRepository } from "@/lib/repositories/insights-provisioning.repository";
import { ConnexInsightsRemoteRepository } from "@/lib/repositories/connex-insights-remote.repository";
import { AuditLogRepository } from "@/lib/repositories/audit-log.repository";
import { createConnexInsightsAdminClient } from "@/lib/integrations/connex-insights/admin-client";
import { generateTemporaryPassword } from "@/lib/utils/generate-temporary-password";
import { isUniqueConstraintError, toErrorMessage } from "@/lib/utils/db-errors";
import { logProvisioningEvent } from "@/lib/logging/connex-insights-provisioning-logger";

export type ProvisioningOutcome =
  | { status: "SUCCEEDED"; temporaryPassword: string; profileId: string }
  | { status: "FAILED_DUPLICATE" }
  | { status: "TENANT_NOT_FOUND" }
  | { status: "FAILED_ERROR" };

export type ProvisioningContext = {
  requestedByProfileId: string;
  requestId: string;
};

/**
 * Orquestra o fluxo completo de provisionamento de usuário no Connex
 * Insights (research.md § D2/D3): valida duplicidade local, valida tenant,
 * registra PENDING, executa o saga de 2 etapas (Auth user + profile) com
 * compensação, e registra auditoria.
 */
export const ConnexInsightsProvisioningService = {
  async createUser(
    input: CriarUsuarioInput,
    context: ProvisioningContext,
    crmSupabase: SupabaseClient,
  ): Promise<ProvisioningOutcome> {
    const startedAt = Date.now();
    const admin = createConnexInsightsAdminClient();

    const outcome = await runProvisioning(input, context, admin);

    logProvisioningEvent({
      endpoint: "/api/aplicacoes/connex-insights/usuarios",
      method: "POST",
      requestId: context.requestId,
      userId: context.requestedByProfileId,
      durationMs: Date.now() - startedAt,
      success: outcome.status === "SUCCEEDED",
      status: outcome.status,
    });

    if (outcome.status === "SUCCEEDED") {
      await AuditLogRepository.record(crmSupabase, {
        actorProfileId: context.requestedByProfileId,
        action: "CREATE_CONNEX_INSIGHTS_USER",
        entityType: "connex_insights_profile",
        entityId: outcome.profileId,
        metadata: { email: input.email, login: input.login, tenantId: input.tenantId },
      }).catch((err) => {
        // Auditoria nunca deve derrubar o caminho feliz já concluído.
        console.error("[audit_log] falha ao registrar CREATE_CONNEX_INSIGHTS_USER", err);
      });
    }

    return outcome;
  },
};

async function runProvisioning(
  input: CriarUsuarioInput,
  context: ProvisioningContext,
  admin: SupabaseClient,
): Promise<ProvisioningOutcome> {
  // Camada 1 de idempotência: duplicidade local antes de qualquer chamada externa.
  const existingLocal = await InsightsProvisioningRepository.findByEmailOrLogin(
    input.email,
    input.login,
  );
  if (existingLocal && existingLocal.status !== "FAILED_ERROR") {
    return { status: "FAILED_DUPLICATE" };
  }

  const tenant = await ConnexInsightsRemoteRepository.findTenantById(admin, input.tenantId);
  if (!tenant) return { status: "TENANT_NOT_FOUND" };

  const pending = await createPendingRequest(input, context, tenant);
  if (!pending) return { status: "FAILED_DUPLICATE" };

  const temporaryPassword = generateTemporaryPassword();

  let authUserId: string;
  try {
    const created = await ConnexInsightsRemoteRepository.createAuthUser(admin, {
      email: input.email,
      password: temporaryPassword,
      tenantId: tenant.id,
    });
    authUserId = created.authUserId;
  } catch (err) {
    await InsightsProvisioningRepository.markFailed(
      pending.id,
      "FAILED_ERROR",
      toErrorMessage(err),
    );
    return { status: "FAILED_ERROR" };
  }

  return finalizeWithProfile(admin, pending.id, authUserId, tenant.id, input, temporaryPassword);
}

async function createPendingRequest(
  input: CriarUsuarioInput,
  context: ProvisioningContext,
  tenant: { id: string; name: string },
) {
  try {
    return await InsightsProvisioningRepository.createPending({
      requestedByProfileId: context.requestedByProfileId,
      insightsTenantId: tenant.id,
      insightsTenantNameSnapshot: tenant.name,
      name: input.name,
      email: input.email,
      login: input.login,
    });
  } catch (err) {
    if (isUniqueConstraintError(err)) return null;
    throw err;
  }
}

/** Passo final do saga: INSERT em `profiles`, com compensação em caso de falha. */
async function finalizeWithProfile(
  admin: SupabaseClient,
  pendingId: string,
  authUserId: string,
  tenantId: string,
  input: CriarUsuarioInput,
  temporaryPassword: string,
): Promise<ProvisioningOutcome> {
  try {
    // `login` → `profiles.login` (mapeamento explícito da dependência
    // cross-repo — ver data-model.md).
    const { profileId } = await ConnexInsightsRemoteRepository.insertProfile(admin, {
      authUserId,
      tenantId,
      displayName: input.name,
      login: input.login,
    });

    await InsightsProvisioningRepository.markSucceeded(pendingId, {
      insightsAuthUserId: authUserId,
      insightsProfileId: profileId,
    });

    return { status: "SUCCEEDED", temporaryPassword, profileId };
  } catch (err) {
    await ConnexInsightsRemoteRepository.deleteAuthUser(admin, authUserId).catch(
      (compensationErr) => {
        console.error(
          "[connex-insights-provisioning] falha na compensação (deleteAuthUser)",
          compensationErr,
        );
      },
    );

    if (isUniqueConstraintError(err)) {
      await InsightsProvisioningRepository.markFailed(
        pendingId,
        "FAILED_DUPLICATE",
        "E-mail ou login já em uso no Connex Insights",
      );
      return { status: "FAILED_DUPLICATE" };
    }

    await InsightsProvisioningRepository.markFailed(pendingId, "FAILED_ERROR", toErrorMessage(err));
    return { status: "FAILED_ERROR" };
  }
}
