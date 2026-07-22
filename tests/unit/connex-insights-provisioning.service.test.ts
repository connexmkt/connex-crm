import { beforeEach, describe, expect, it, vi } from "vitest";

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

vi.mock("@/lib/repositories/insights-provisioning.repository", () => ({
  InsightsProvisioningRepository: {
    findByEmailOrLogin: vi.fn(),
    createPending: vi.fn(),
    markSucceeded: vi.fn(),
    markFailed: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/connex-insights-remote.repository", () => ({
  ConnexInsightsRemoteRepository: {
    findTenantById: vi.fn(),
    createAuthUser: vi.fn(),
    insertProfile: vi.fn(),
    deleteAuthUser: vi.fn(),
  },
}));

import { InsightsProvisioningRepository } from "@/lib/repositories/insights-provisioning.repository";
import { ConnexInsightsRemoteRepository } from "@/lib/repositories/connex-insights-remote.repository";
import { AuditLogRepository } from "@/lib/repositories/audit-log.repository";
import { ConnexInsightsProvisioningService } from "@/lib/services/connex-insights-provisioning.service";
import type { CriarUsuarioInput } from "@/app/aplicacoes/schemas/criar-usuario.schema";
import type { SupabaseClient } from "@supabase/supabase-js";

const input: CriarUsuarioInput = {
  name: "Ana Souza",
  email: "ana@zehmotoca.com.br",
  login: "ana.souza",
  tenantId: "5f4a2b3c-6e6a-4c4f-9b1a-1a2b3c4d5e6f",
};

const context = { requestedByProfileId: "admin-1", requestId: "req-1" };
const crmSupabase = {} as SupabaseClient;

const tenant = { id: input.tenantId, name: "Zeh Motoca" };
const pendingRow = { id: "pending-1" };

describe("ConnexInsightsProvisioningService.createUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(InsightsProvisioningRepository.findByEmailOrLogin).mockResolvedValue(null);
    vi.mocked(ConnexInsightsRemoteRepository.findTenantById).mockResolvedValue(tenant);
    vi.mocked(InsightsProvisioningRepository.createPending).mockResolvedValue(pendingRow as never);
    vi.mocked(ConnexInsightsRemoteRepository.createAuthUser).mockResolvedValue({
      authUserId: "auth-user-1",
    });
    vi.mocked(ConnexInsightsRemoteRepository.insertProfile).mockResolvedValue({
      profileId: "profile-1",
    });
    vi.mocked(InsightsProvisioningRepository.markSucceeded).mockResolvedValue(undefined as never);
    vi.mocked(InsightsProvisioningRepository.markFailed).mockResolvedValue(undefined as never);
    vi.mocked(ConnexInsightsRemoteRepository.deleteAuthUser).mockResolvedValue(undefined);
  });

  it("caminho feliz: retorna SUCCEEDED com senha temporária e registra audit_log", async () => {
    const result = await ConnexInsightsProvisioningService.createUser(input, context, crmSupabase);

    expect(result).toEqual({
      status: "SUCCEEDED",
      temporaryPassword: "TempPass123!",
      profileId: "profile-1",
    });
    expect(InsightsProvisioningRepository.markSucceeded).toHaveBeenCalledWith("pending-1", {
      insightsAuthUserId: "auth-user-1",
      insightsProfileId: "profile-1",
    });
    expect(AuditLogRepository.record).toHaveBeenCalledWith(
      crmSupabase,
      expect.objectContaining({
        actorProfileId: "admin-1",
        action: "CREATE_CONNEX_INSIGHTS_USER",
        entityId: "profile-1",
      }),
    );
  });

  it("duplicidade local: retorna FAILED_DUPLICATE sem chamar o Insights", async () => {
    vi.mocked(InsightsProvisioningRepository.findByEmailOrLogin).mockResolvedValue({
      status: "SUCCEEDED",
    } as never);

    const result = await ConnexInsightsProvisioningService.createUser(input, context, crmSupabase);

    expect(result).toEqual({ status: "FAILED_DUPLICATE" });
    expect(ConnexInsightsRemoteRepository.createAuthUser).not.toHaveBeenCalled();
  });

  it("tenant não encontrado: retorna TENANT_NOT_FOUND", async () => {
    vi.mocked(ConnexInsightsRemoteRepository.findTenantById).mockResolvedValue(null);

    const result = await ConnexInsightsProvisioningService.createUser(input, context, crmSupabase);

    expect(result).toEqual({ status: "TENANT_NOT_FOUND" });
  });

  it("requisições concorrentes: violação de UNIQUE ao criar o PENDING resulta em FAILED_DUPLICATE", async () => {
    vi.mocked(InsightsProvisioningRepository.createPending).mockRejectedValue({ code: "P2002" });

    const result = await ConnexInsightsProvisioningService.createUser(input, context, crmSupabase);

    expect(result).toEqual({ status: "FAILED_DUPLICATE" });
    expect(ConnexInsightsRemoteRepository.createAuthUser).not.toHaveBeenCalled();
  });

  it("falha ao criar Auth user no Insights: retorna FAILED_ERROR e marca o registro local", async () => {
    vi.mocked(ConnexInsightsRemoteRepository.createAuthUser).mockRejectedValue(
      new Error("Insights indisponível"),
    );

    const result = await ConnexInsightsProvisioningService.createUser(input, context, crmSupabase);

    expect(result).toEqual({ status: "FAILED_ERROR" });
    expect(InsightsProvisioningRepository.markFailed).toHaveBeenCalledWith(
      "pending-1",
      "FAILED_ERROR",
      "Insights indisponível",
    );
  });

  it("falha ao inserir profile: compensa com deleteAuthUser e marca FAILED_DUPLICATE em violação de UNIQUE", async () => {
    vi.mocked(ConnexInsightsRemoteRepository.insertProfile).mockRejectedValue({ code: "23505" });

    const result = await ConnexInsightsProvisioningService.createUser(input, context, crmSupabase);

    expect(result).toEqual({ status: "FAILED_DUPLICATE" });
    expect(ConnexInsightsRemoteRepository.deleteAuthUser).toHaveBeenCalledWith(
      expect.anything(),
      "auth-user-1",
    );
    expect(InsightsProvisioningRepository.markFailed).toHaveBeenCalledWith(
      "pending-1",
      "FAILED_DUPLICATE",
      expect.any(String),
    );
  });

  it("falha genérica ao inserir profile: compensa com deleteAuthUser e marca FAILED_ERROR", async () => {
    vi.mocked(ConnexInsightsRemoteRepository.insertProfile).mockRejectedValue(
      new Error("erro inesperado"),
    );

    const result = await ConnexInsightsProvisioningService.createUser(input, context, crmSupabase);

    expect(result).toEqual({ status: "FAILED_ERROR" });
    expect(ConnexInsightsRemoteRepository.deleteAuthUser).toHaveBeenCalledWith(
      expect.anything(),
      "auth-user-1",
    );
  });
});
