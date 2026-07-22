import { prisma } from "@/lib/db/prisma";
import type { ProvisioningStatus } from "@/lib/generated/prisma";

export type CreatePendingInput = {
  requestedByProfileId: string;
  insightsTenantId: string;
  insightsTenantNameSnapshot: string;
  name: string;
  email: string;
  login: string;
};

/**
 * Repository Prisma da tabela `insights_user_provisioning_requests`
 * (propriedade do connex-crm). Nunca acessa o banco do Connex Insights —
 * ver `connex-insights-remote.repository.ts` para isso.
 */
export const InsightsProvisioningRepository = {
  /** Camada 1 de idempotência (research.md § D3): falha rápido via
   * UNIQUE(email)/UNIQUE(login) antes de qualquer chamada ao Insights. */
  async createPending(input: CreatePendingInput) {
    return prisma.insightsUserProvisioningRequest.create({
      data: {
        requestedByProfileId: input.requestedByProfileId,
        insightsTenantId: input.insightsTenantId,
        insightsTenantNameSnapshot: input.insightsTenantNameSnapshot,
        name: input.name,
        email: input.email,
        login: input.login,
        status: "PENDING",
      },
    });
  },

  async findByEmailOrLogin(email: string, login: string) {
    return prisma.insightsUserProvisioningRequest.findFirst({
      where: { OR: [{ email }, { login }] },
    });
  },

  async markSucceeded(
    id: string,
    data: { insightsAuthUserId: string; insightsProfileId: string },
  ) {
    return prisma.insightsUserProvisioningRequest.update({
      where: { id },
      data: {
        status: "SUCCEEDED",
        insightsAuthUserId: data.insightsAuthUserId,
        insightsProfileId: data.insightsProfileId,
        temporaryPasswordIssued: true,
      },
    });
  },

  async markFailed(
    id: string,
    status: Extract<ProvisioningStatus, "FAILED_DUPLICATE" | "FAILED_ERROR">,
    failureReason: string,
  ) {
    return prisma.insightsUserProvisioningRequest.update({
      where: { id },
      data: { status, failureReason },
    });
  },
};
