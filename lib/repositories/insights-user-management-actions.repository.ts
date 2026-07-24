import { prisma } from "@/lib/db/prisma";
import type {
  InsightsUserActionType,
  InsightsUserManagementAction,
} from "@/lib/generated/prisma";

export type CreatePendingActionInput = {
  requestedByProfileId: string;
  insightsUserId: string;
  actionType: InsightsUserActionType;
  previousStatus: string;
};

/**
 * Repository Prisma da tabela `insights_user_management_actions` (auditoria
 * e idempotência das ações de inativar/reativar/resetar senha — propriedade
 * do connex-crm). Nunca acessa o banco do Connex Insights diretamente — ver
 * `connex-insights-remote.repository.ts` para isso.
 */
export const InsightsUserManagementActionsRepository = {
  async createPending(
    input: CreatePendingActionInput,
  ): Promise<InsightsUserManagementAction> {
    return prisma.insightsUserManagementAction.create({
      data: {
        requestedByProfileId: input.requestedByProfileId,
        insightsUserId: input.insightsUserId,
        actionType: input.actionType,
        previousStatus: input.previousStatus,
        status: "PENDING",
      },
    });
  },

  async markSucceeded(
    id: string,
    options: { temporaryPasswordIssued: boolean } = { temporaryPasswordIssued: false },
  ): Promise<InsightsUserManagementAction> {
    return prisma.insightsUserManagementAction.update({
      where: { id },
      data: {
        status: "SUCCEEDED",
        temporaryPasswordIssued: options.temporaryPasswordIssued,
      },
    });
  },

  async markFailed(
    id: string,
    failureReason: string,
  ): Promise<InsightsUserManagementAction> {
    return prisma.insightsUserManagementAction.update({
      where: { id },
      data: { status: "FAILED_ERROR", failureReason },
    });
  },
};
