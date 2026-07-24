import { beforeEach, describe, expect, it, vi } from "vitest";

const { getUserMock, deactivateUserMock } = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  deactivateUserMock: vi.fn(),
}));

vi.mock("@/lib/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: getUserMock },
  })),
}));

vi.mock("@/lib/services/connex-insights-user-management.service", () => ({
  ConnexInsightsUserManagementService: { deactivateUser: deactivateUserMock },
}));

import { POST } from "@/app/api/aplicacoes/connex-insights/usuarios/[userId]/desativar/route";

function buildRequest(userId: string) {
  return {
    request: new Request(
      `http://localhost/api/aplicacoes/connex-insights/usuarios/${userId}/desativar`,
      { method: "POST" },
    ),
    context: { params: Promise.resolve({ userId }) },
  };
}

describe("POST /api/aplicacoes/connex-insights/usuarios/[userId]/desativar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUserMock.mockResolvedValue({ data: { user: { id: "admin-1" } } });
  });

  it("retorna 401 quando não há sessão autenticada", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    const { request, context } = buildRequest("user-1");

    const response = await POST(request, context);

    expect(response.status).toBe(401);
    expect(deactivateUserMock).not.toHaveBeenCalled();
  });

  it("caminho feliz: retorna 200 com o novo status", async () => {
    deactivateUserMock.mockResolvedValue({ status: "SUCCEEDED" });
    const { request, context } = buildRequest("user-1");

    const response = await POST(request, context);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data).toEqual({ status: "SUSPENDED" });
    expect(deactivateUserMock).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ requestedByProfileId: "admin-1" }),
      expect.anything(),
    );
  });

  it("retorna 404 quando o usuário não existe no Connex Insights", async () => {
    deactivateUserMock.mockResolvedValue({ status: "NOT_FOUND" });
    const { request, context } = buildRequest("user-inexistente");

    const response = await POST(request, context);

    expect(response.status).toBe(404);
  });

  it("retorna 502 quando a operação externa falha", async () => {
    deactivateUserMock.mockResolvedValue({ status: "FAILED_ERROR" });
    const { request, context } = buildRequest("user-1");

    const response = await POST(request, context);

    expect(response.status).toBe(502);
  });
});
