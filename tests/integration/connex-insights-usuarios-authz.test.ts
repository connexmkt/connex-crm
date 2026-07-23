import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { getUserMock, createUserMock } = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  createUserMock: vi.fn(),
}));

vi.mock("@/lib/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: getUserMock },
  })),
}));

vi.mock("@/lib/integrations/connex-insights/admin-client", () => ({
  createConnexInsightsAdminClient: vi.fn(() => ({})),
}));

vi.mock("@/lib/services/connex-insights-provisioning.service", () => ({
  ConnexInsightsProvisioningService: { createUser: createUserMock },
}));

import { POST } from "@/app/api/aplicacoes/connex-insights/usuarios/route";

const validPayload = {
  name: "Ana Souza",
  email: "ana@zehmotoca.com.br",
  login: "ana.souza",
  tenantId: "5f4a2b3c-6e6a-4c4f-9b1a-1a2b3c4d5e6f",
};

function buildRequest(body: unknown) {
  return new NextRequest("http://localhost/api/aplicacoes/connex-insights/usuarios", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/aplicacoes/connex-insights/usuarios — autorização", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna 401 quando não há sessão autenticada", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });

    const response = await POST(buildRequest(validPayload));

    expect(response.status).toBe(401);
    expect(createUserMock).not.toHaveBeenCalled();
  });

  it("retorna 400 para payload inválido mesmo autenticado", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } } });

    const response = await POST(buildRequest({ ...validPayload, email: "invalido" }));

    expect(response.status).toBe(400);
    expect(createUserMock).not.toHaveBeenCalled();
  });

  it("chama o service e retorna 201 para qualquer usuário autenticado com payload válido", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } } });
    createUserMock.mockResolvedValue({
      status: "SUCCEEDED",
      temporaryPassword: "Temp1234!",
      profileId: "profile-1",
    });

    const response = await POST(buildRequest(validPayload));
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.data.temporaryPassword).toBe("Temp1234!");
    expect(createUserMock).toHaveBeenCalledOnce();
  });
});
