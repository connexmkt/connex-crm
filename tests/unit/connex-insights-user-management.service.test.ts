import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

vi.mock("@/lib/integrations/connex-insights/admin-client", () => ({
  createConnexInsightsAdminClient: vi.fn(() => ({})),
}));

vi.mock("@/lib/utils/generate-temporary-password", () => ({
  generateTemporaryPassword: vi.fn(() => "TempPass123!"),
}));

vi.mock("@/lib/logging/connex-insights-provisioning-logger", () => ({
  logProvisioningEvent: vi.fn(),
}));

vi.mock("@/lib/repositories/audit-log.repository", () => ({
  AuditLogRepository: { record: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock("@/lib/repositories/insights-user-management-actions.repository", () => ({
  InsightsUserManagementActionsRepository: {
    createPending: vi.fn(),
    markSucceeded: vi.fn(),
    markFailed: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/connex-insights-remote.repository", () => ({
  ConnexInsightsRemoteRepository: {
    getUserById: vi.fn(),
    setUserStatus: vi.fn(),
    resetUserPassword: vi.fn(),
  },
}));

import { InsightsUserManagementActionsRepository } from "@/lib/repositories/insights-user-management-actions.repository";
import { ConnexInsightsRemoteRepository } from "@/lib/repositories/connex-insights-remote.repository";
import { AuditLogRepository } from "@/lib/repositories/audit-log.repository";
import { ConnexInsightsUserManagementService } from "@/lib/services/connex-insights-user-management.service";

const context = { requestedByProfileId: "admin-1", requestId: "req-1" };
const crmSupabase = {} as SupabaseClient;
const pendingRow = { id: "pending-1" };

function mockUser(status: string) {
  vi.mocked(ConnexInsightsRemoteRepository.getUserById).mockResolvedValue({
    id: "user-1",
    displayName: "Ana Souza",
    status: status as never,
    tenantId: "tenant-1",
  });
}

describe("ConnexInsightsUserManagementService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(InsightsUserManagementActionsRepository.createPending).mockResolvedValue(
      pendingRow as never,
    );
    vi.mocked(InsightsUserManagementActionsRepository.markSucceeded).mockResolvedValue(
      undefined as never,
    );
    vi.mocked(InsightsUserManagementActionsRepository.markFailed).mockResolvedValue(
      undefined as never,
    );
  });

  describe("deactivateUser", () => {
    it("caminho feliz: inativa a partir de qualquer status e registra audit_log", async () => {
      mockUser("ACTIVE");
      vi.mocked(ConnexInsightsRemoteRepository.setUserStatus).mockResolvedValue(undefined);

      const result = await ConnexInsightsUserManagementService.deactivateUser(
        "user-1",
        context,
        crmSupabase,
      );

      expect(result).toEqual({ status: "SUCCEEDED" });
      expect(ConnexInsightsRemoteRepository.setUserStatus).toHaveBeenCalledWith(
        expect.anything(),
        "user-1",
        "SUSPENDED",
      );
      expect(InsightsUserManagementActionsRepository.createPending).toHaveBeenCalledWith({
        requestedByProfileId: "admin-1",
        insightsUserId: "user-1",
        actionType: "DEACTIVATE",
        previousStatus: "ACTIVE",
      });
      expect(InsightsUserManagementActionsRepository.markSucceeded).toHaveBeenCalledWith(
        "pending-1",
      );
      expect(AuditLogRepository.record).toHaveBeenCalledWith(
        crmSupabase,
        expect.objectContaining({
          actorProfileId: "admin-1",
          action: "DEACTIVATE_CONNEX_INSIGHTS_USER",
          entityId: "user-1",
        }),
      );
    });

    it("usuário não encontrado: retorna NOT_FOUND sem criar registro de auditoria/idempotência", async () => {
      vi.mocked(ConnexInsightsRemoteRepository.getUserById).mockResolvedValue(null);

      const result = await ConnexInsightsUserManagementService.deactivateUser(
        "user-inexistente",
        context,
        crmSupabase,
      );

      expect(result).toEqual({ status: "NOT_FOUND" });
      expect(InsightsUserManagementActionsRepository.createPending).not.toHaveBeenCalled();
      expect(ConnexInsightsRemoteRepository.setUserStatus).not.toHaveBeenCalled();
    });

    it("falha ao atualizar status no Insights: retorna FAILED_ERROR, marca o registro e não audita", async () => {
      mockUser("ACTIVE");
      vi.mocked(ConnexInsightsRemoteRepository.setUserStatus).mockRejectedValue(
        new Error("Insights indisponível"),
      );

      const result = await ConnexInsightsUserManagementService.deactivateUser(
        "user-1",
        context,
        crmSupabase,
      );

      expect(result).toEqual({ status: "FAILED_ERROR" });
      expect(InsightsUserManagementActionsRepository.markFailed).toHaveBeenCalledWith(
        "pending-1",
        "Insights indisponível",
      );
      expect(AuditLogRepository.record).not.toHaveBeenCalled();
    });
  });

  describe("reactivateUser", () => {
    it("caminho feliz: reativa a partir de SUSPENDED e registra audit_log", async () => {
      mockUser("SUSPENDED");
      vi.mocked(ConnexInsightsRemoteRepository.setUserStatus).mockResolvedValue(undefined);

      const result = await ConnexInsightsUserManagementService.reactivateUser(
        "user-1",
        context,
        crmSupabase,
      );

      expect(result).toEqual({ status: "SUCCEEDED" });
      expect(ConnexInsightsRemoteRepository.setUserStatus).toHaveBeenCalledWith(
        expect.anything(),
        "user-1",
        "ACTIVE",
      );
      expect(AuditLogRepository.record).toHaveBeenCalledWith(
        crmSupabase,
        expect.objectContaining({ action: "REACTIVATE_CONNEX_INSIGHTS_USER" }),
      );
    });

    it.each(["ACTIVE", "INACTIVE"])(
      "estado inválido: retorna INVALID_STATE quando status atual é %s (não é SUSPENDED)",
      async (status) => {
        mockUser(status);

        const result = await ConnexInsightsUserManagementService.reactivateUser(
          "user-1",
          context,
          crmSupabase,
        );

        expect(result).toEqual({ status: "INVALID_STATE" });
        expect(InsightsUserManagementActionsRepository.createPending).not.toHaveBeenCalled();
        expect(ConnexInsightsRemoteRepository.setUserStatus).not.toHaveBeenCalled();
      },
    );

    it("usuário não encontrado: retorna NOT_FOUND", async () => {
      vi.mocked(ConnexInsightsRemoteRepository.getUserById).mockResolvedValue(null);

      const result = await ConnexInsightsUserManagementService.reactivateUser(
        "user-inexistente",
        context,
        crmSupabase,
      );

      expect(result).toEqual({ status: "NOT_FOUND" });
    });

    it("falha ao atualizar status no Insights: retorna FAILED_ERROR e não audita", async () => {
      mockUser("SUSPENDED");
      vi.mocked(ConnexInsightsRemoteRepository.setUserStatus).mockRejectedValue(
        new Error("Insights indisponível"),
      );

      const result = await ConnexInsightsUserManagementService.reactivateUser(
        "user-1",
        context,
        crmSupabase,
      );

      expect(result).toEqual({ status: "FAILED_ERROR" });
      expect(InsightsUserManagementActionsRepository.markFailed).toHaveBeenCalledWith(
        "pending-1",
        "Insights indisponível",
      );
      expect(AuditLogRepository.record).not.toHaveBeenCalled();
    });
  });

  describe("resetPassword", () => {
    it("caminho feliz: retorna a senha temporária uma única vez e audita sem expô-la", async () => {
      mockUser("ACTIVE");
      vi.mocked(ConnexInsightsRemoteRepository.resetUserPassword).mockResolvedValue(undefined);

      const result = await ConnexInsightsUserManagementService.resetPassword(
        "user-1",
        context,
        crmSupabase,
      );

      expect(result).toEqual({ status: "SUCCEEDED", temporaryPassword: "TempPass123!" });
      expect(ConnexInsightsRemoteRepository.resetUserPassword).toHaveBeenCalledWith(
        expect.anything(),
        "user-1",
        "TempPass123!",
      );
      expect(InsightsUserManagementActionsRepository.markSucceeded).toHaveBeenCalledWith(
        "pending-1",
        { temporaryPasswordIssued: true },
      );

      const auditCall = vi.mocked(AuditLogRepository.record).mock.calls[0]?.[1];
      expect(auditCall).toEqual(
        expect.objectContaining({
          action: "RESET_CONNEX_INSIGHTS_USER_PASSWORD",
          entityId: "user-1",
        }),
      );
      expect(JSON.stringify(auditCall)).not.toContain("TempPass123!");
    });

    it("usuário não encontrado: retorna NOT_FOUND sem gerar senha", async () => {
      vi.mocked(ConnexInsightsRemoteRepository.getUserById).mockResolvedValue(null);

      const result = await ConnexInsightsUserManagementService.resetPassword(
        "user-inexistente",
        context,
        crmSupabase,
      );

      expect(result).toEqual({ status: "NOT_FOUND" });
      expect(InsightsUserManagementActionsRepository.createPending).not.toHaveBeenCalled();
    });

    it("falha ao resetar senha no Insights: retorna FAILED_ERROR, marca o registro e não audita", async () => {
      mockUser("ACTIVE");
      vi.mocked(ConnexInsightsRemoteRepository.resetUserPassword).mockRejectedValue(
        new Error("Insights indisponível"),
      );

      const result = await ConnexInsightsUserManagementService.resetPassword(
        "user-1",
        context,
        crmSupabase,
      );

      expect(result).toEqual({ status: "FAILED_ERROR" });
      expect(InsightsUserManagementActionsRepository.markFailed).toHaveBeenCalledWith(
        "pending-1",
        "Insights indisponível",
      );
      expect(AuditLogRepository.record).not.toHaveBeenCalled();
    });
  });
});
