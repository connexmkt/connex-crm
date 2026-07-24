import { beforeEach, describe, expect, it, vi } from "vitest";

const { createMock, updateMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
  updateMock: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    insightsUserManagementAction: {
      create: createMock,
      update: updateMock,
    },
  },
}));

import { InsightsUserManagementActionsRepository } from "@/lib/repositories/insights-user-management-actions.repository";

describe("InsightsUserManagementActionsRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createPending", () => {
    it("cria o registro com status PENDING a partir do input informado", async () => {
      const row = { id: "action-1", status: "PENDING" };
      createMock.mockResolvedValue(row);

      const result = await InsightsUserManagementActionsRepository.createPending({
        requestedByProfileId: "admin-1",
        insightsUserId: "user-1",
        actionType: "DEACTIVATE",
        previousStatus: "ACTIVE",
      });

      expect(result).toBe(row);
      expect(createMock).toHaveBeenCalledWith({
        data: {
          requestedByProfileId: "admin-1",
          insightsUserId: "user-1",
          actionType: "DEACTIVATE",
          previousStatus: "ACTIVE",
          status: "PENDING",
        },
      });
    });
  });

  describe("markSucceeded", () => {
    it("marca como SUCCEEDED sem indicar emissão de senha temporária por padrão", async () => {
      const row = { id: "action-1", status: "SUCCEEDED" };
      updateMock.mockResolvedValue(row);

      const result = await InsightsUserManagementActionsRepository.markSucceeded("action-1");

      expect(result).toBe(row);
      expect(updateMock).toHaveBeenCalledWith({
        where: { id: "action-1" },
        data: { status: "SUCCEEDED", temporaryPasswordIssued: false },
      });
    });

    it("marca como SUCCEEDED indicando emissão de senha temporária quando solicitado", async () => {
      updateMock.mockResolvedValue({ id: "action-1", status: "SUCCEEDED" });

      await InsightsUserManagementActionsRepository.markSucceeded("action-1", {
        temporaryPasswordIssued: true,
      });

      expect(updateMock).toHaveBeenCalledWith({
        where: { id: "action-1" },
        data: { status: "SUCCEEDED", temporaryPasswordIssued: true },
      });
    });
  });

  describe("markFailed", () => {
    it("marca como FAILED_ERROR com o motivo informado", async () => {
      const row = { id: "action-1", status: "FAILED_ERROR" };
      updateMock.mockResolvedValue(row);

      const result = await InsightsUserManagementActionsRepository.markFailed(
        "action-1",
        "Insights indisponível",
      );

      expect(result).toBe(row);
      expect(updateMock).toHaveBeenCalledWith({
        where: { id: "action-1" },
        data: { status: "FAILED_ERROR", failureReason: "Insights indisponível" },
      });
    });
  });
});
