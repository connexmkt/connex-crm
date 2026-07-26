import { beforeEach, describe, expect, it, vi } from "vitest";

const { listMonthsByClienteMock, findByClienteAndReferenceMock } = vi.hoisted(() => ({
  listMonthsByClienteMock: vi.fn(),
  findByClienteAndReferenceMock: vi.fn(),
}));

vi.mock("@/lib/server", () => ({
  createClient: vi.fn(async () => ({})),
}));

vi.mock("@/lib/integrations/connex-insights/admin-client", () => ({
  createConnexInsightsAdminClient: vi.fn(() => ({})),
}));

vi.mock("@/lib/repositories/instagram-monthly-reports.repository", () => ({
  InstagramMonthlyReportsRepository: {
    listMonthsByCliente: listMonthsByClienteMock,
    findByClienteAndReference: findByClienteAndReferenceMock,
  },
}));

import { InstagramReportsService } from "@/lib/services/instagram-reports.service";

describe("InstagramReportsService — métodos mensais", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("listMonthlyMonths delega ao repository com clienteId/page/limit", async () => {
    const page = { items: [{ year: 2026, month: 7 }], total: 1 };
    listMonthsByClienteMock.mockResolvedValue(page);

    const result = await InstagramReportsService.listMonthlyMonths("cliente-1", 1, 12);

    expect(listMonthsByClienteMock).toHaveBeenCalledWith(expect.anything(), "cliente-1", 1, 12);
    expect(result).toEqual(page);
  });

  it("getMonthlyReport preserva a ordem de topPosts recebida do repository (índice 0 = Top 1)", async () => {
    const report = {
      id: "report-1",
      clienteId: "cliente-1",
      referenceYear: 2026,
      referenceMonth: 7,
      generatedAt: "2026-07-31T00:00:00.000Z",
      status: "AVAILABLE",
      followersGained: 120,
      followersStart: 1000,
      followersEnd: 1120,
      followersGrowthPct: 12,
      accountsReached: 5000,
      topPosts: [
        { role: "TOP_1", instagramMediaId: "media-1" },
        { role: "TOP_2", instagramMediaId: "media-2" },
        { role: "TOP_3", instagramMediaId: "media-3" },
      ],
      worstPost: { role: "WORST", instagramMediaId: "media-4" },
    };
    findByClienteAndReferenceMock.mockResolvedValue(report);

    const result = await InstagramReportsService.getMonthlyReport("cliente-1", 2026, 7);

    expect(findByClienteAndReferenceMock).toHaveBeenCalledWith(expect.anything(), "cliente-1", 2026, 7);
    expect(result?.topPosts.map((post) => post.role)).toEqual(["TOP_1", "TOP_2", "TOP_3"]);
    expect(result?.topPosts[0].instagramMediaId).toBe("media-1");
  });

  it("getMonthlyReport retorna null quando não há relatório para o período", async () => {
    findByClienteAndReferenceMock.mockResolvedValue(null);

    const result = await InstagramReportsService.getMonthlyReport("cliente-1", 2020, 1);

    expect(result).toBeNull();
  });
});
