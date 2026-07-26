import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  listMonthsByClienteMock,
  listWeeksByClienteAndMonthMock,
  findByClienteAndReferenceMock,
} = vi.hoisted(() => ({
  listMonthsByClienteMock: vi.fn(),
  listWeeksByClienteAndMonthMock: vi.fn(),
  findByClienteAndReferenceMock: vi.fn(),
}));

vi.mock("@/lib/server", () => ({
  createClient: vi.fn(async () => ({})),
}));

vi.mock("@/lib/integrations/connex-insights/admin-client", () => ({
  createConnexInsightsAdminClient: vi.fn(() => ({})),
}));

vi.mock("@/lib/repositories/instagram-weekly-reports.repository", () => ({
  InstagramWeeklyReportsRepository: {
    listMonthsByCliente: listMonthsByClienteMock,
    listWeeksByClienteAndMonth: listWeeksByClienteAndMonthMock,
    findByClienteAndReference: findByClienteAndReferenceMock,
  },
}));

import { InstagramReportsService } from "@/lib/services/instagram-reports.service";

describe("InstagramReportsService — métodos semanais", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("listWeeklyMonths delega ao repository com clienteId/page/limit", async () => {
    const page = { items: [{ year: 2026, month: 7 }], total: 1 };
    listMonthsByClienteMock.mockResolvedValue(page);

    const result = await InstagramReportsService.listWeeklyMonths("cliente-1", 2, 12);

    expect(listMonthsByClienteMock).toHaveBeenCalledWith(expect.anything(), "cliente-1", 2, 12);
    expect(result).toEqual(page);
  });

  it("listWeeksForMonth delega ao repository preservando a ordenação decrescente definida no repository", async () => {
    const page = {
      items: [
        { week: 4, periodStart: "2026-07-20", periodEnd: "2026-07-26", status: "AVAILABLE", generatedAt: "2026-07-26T00:00:00.000Z" },
        { week: 3, periodStart: "2026-07-13", periodEnd: "2026-07-19", status: "AVAILABLE", generatedAt: "2026-07-19T00:00:00.000Z" },
      ],
      total: 2,
    };
    listWeeksByClienteAndMonthMock.mockResolvedValue(page);

    const result = await InstagramReportsService.listWeeksForMonth("cliente-1", 2026, 7, 1, 12);

    expect(listWeeksByClienteAndMonthMock).toHaveBeenCalledWith(
      expect.anything(),
      "cliente-1",
      2026,
      7,
      1,
      12,
    );
    expect(result.items.map((item) => item.week)).toEqual([4, 3]);
  });

  it("getWeeklyReport retorna o relatório encontrado com melhor/pior postagem", async () => {
    const report = {
      id: "report-1",
      clienteId: "cliente-1",
      referenceYear: 2026,
      referenceMonth: 7,
      referenceWeek: 4,
      periodStart: "2026-07-20",
      periodEnd: "2026-07-26",
      generatedAt: "2026-07-26T00:00:00.000Z",
      status: "AVAILABLE",
      bestPost: null,
      worstPost: null,
    };
    findByClienteAndReferenceMock.mockResolvedValue(report);

    const result = await InstagramReportsService.getWeeklyReport("cliente-1", 2026, 7, 4);

    expect(findByClienteAndReferenceMock).toHaveBeenCalledWith(
      expect.anything(),
      "cliente-1",
      2026,
      7,
      4,
    );
    expect(result).toEqual(report);
  });

  it("getWeeklyReport retorna null quando não há relatório para o período", async () => {
    findByClienteAndReferenceMock.mockResolvedValue(null);

    const result = await InstagramReportsService.getWeeklyReport("cliente-1", 2026, 1, 1);

    expect(result).toBeNull();
  });
});
