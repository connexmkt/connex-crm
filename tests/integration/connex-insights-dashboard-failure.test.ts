import { beforeEach, describe, expect, it, vi } from "vitest";

const { getUserMock } = vi.hoisted(() => ({
  getUserMock: vi.fn(),
}));

vi.mock("@/lib/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: getUserMock },
  })),
}));

vi.mock("@/lib/integrations/connex-insights/admin-client", () => ({
  createConnexInsightsAdminClient: vi.fn(() => ({})),
}));

vi.mock("@/lib/repositories/connex-insights-remote.repository", () => ({
  ConnexInsightsRemoteRepository: {
    countUsers: vi.fn(),
    countTenants: vi.fn(),
  },
}));

import { GET } from "@/app/api/aplicacoes/connex-insights/dashboard/route";
import { ConnexInsightsRemoteRepository } from "@/lib/repositories/connex-insights-remote.repository";

describe("GET /api/aplicacoes/connex-insights/dashboard — indisponibilidade", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } } });
  });

  it("retorna 502 sem quebrar quando o Connex Insights está indisponível", async () => {
    vi.mocked(ConnexInsightsRemoteRepository.countUsers).mockRejectedValue(
      new Error("connection refused"),
    );
    vi.mocked(ConnexInsightsRemoteRepository.countTenants).mockResolvedValue(2);

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(502);
    expect(json.error).not.toContain("connection refused");
  });

  it("retorna 200 com os indicadores quando ambas as consultas funcionam", async () => {
    vi.mocked(ConnexInsightsRemoteRepository.countUsers).mockResolvedValue(10);
    vi.mocked(ConnexInsightsRemoteRepository.countTenants).mockResolvedValue(2);

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data).toEqual({ totalUsers: 10, totalTenants: 2 });
  });
});
