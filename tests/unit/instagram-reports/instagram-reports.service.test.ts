import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  listClientesComRelatoriosMock,
  getLastViewedAtMock,
  listIntegrationsByTenantIdsMock,
} = vi.hoisted(() => ({
  listClientesComRelatoriosMock: vi.fn(),
  getLastViewedAtMock: vi.fn(),
  listIntegrationsByTenantIdsMock: vi.fn(),
}));

vi.mock("@/lib/server", () => ({
  createClient: vi.fn(async () => ({})),
}));

vi.mock("@/lib/integrations/connex-insights/admin-client", () => ({
  createConnexInsightsAdminClient: vi.fn(() => ({})),
}));

vi.mock("@/lib/repositories/instagram-report-summary.repository", () => ({
  InstagramReportSummaryRepository: {
    listClientesComRelatorios: listClientesComRelatoriosMock,
  },
}));

vi.mock("@/lib/repositories/instagram-report-views.repository", () => ({
  InstagramReportViewsRepository: {
    getLastViewedAt: getLastViewedAtMock,
  },
}));

vi.mock("@/lib/repositories/connex-insights-remote.repository", () => ({
  ConnexInsightsRemoteRepository: {
    listIntegrationsByTenantIds: listIntegrationsByTenantIdsMock,
  },
}));

import { InstagramReportsService } from "@/lib/services/instagram-reports.service";

const summaryItem = (overrides: Partial<Record<string, unknown>> = {}) => ({
  clienteId: "cliente-1",
  name: "Cliente 1",
  logo: null,
  lastReportReferenceDate: "2026-07-20",
  lastGeneratedAt: "2026-07-21T00:00:00.000Z",
  hasWeeklyReports: true,
  hasMonthlyReports: false,
  ...overrides,
});

describe("InstagramReportsService.listClientsWithReports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("combina resumo local com status/avatar remoto em lote", async () => {
    listClientesComRelatoriosMock.mockResolvedValue({ items: [summaryItem()], total: 1 });
    listIntegrationsByTenantIdsMock.mockResolvedValue([
      {
        tenantId: "cliente-1",
        username: "cliente1_insta",
        profilePictureUrl: "https://cdn/cliente1.png",
        status: "CONNECTED",
      },
    ]);
    getLastViewedAtMock.mockResolvedValue(null);

    const result = await InstagramReportsService.listClientsWithReports(1, 12, "user-1");

    expect(listIntegrationsByTenantIdsMock).toHaveBeenCalledWith(expect.anything(), ["cliente-1"]);
    expect(result).toEqual({
      items: [
        {
          clienteId: "cliente-1",
          name: "Cliente 1",
          logo: null,
          username: "cliente1_insta",
          profilePictureUrl: "https://cdn/cliente1.png",
          integrationStatus: "CONNECTED",
          lastReportReferenceDate: "2026-07-20",
          isNew: true,
        },
      ],
      total: 1,
      page: 1,
      limit: 12,
    });
  });

  it("marca isNew=false quando o último relatório não é mais recente que a última visualização", async () => {
    listClientesComRelatoriosMock.mockResolvedValue({ items: [summaryItem()], total: 1 });
    listIntegrationsByTenantIdsMock.mockResolvedValue([]);
    getLastViewedAtMock.mockResolvedValue("2026-07-25T00:00:00.000Z");

    const result = await InstagramReportsService.listClientsWithReports(1, 12, "user-1");

    expect(result.items[0].isNew).toBe(false);
  });

  it("isola falha na leitura remota: mantém os clientes, marcando integrationStatus como indisponível", async () => {
    listClientesComRelatoriosMock.mockResolvedValue({
      items: [summaryItem(), summaryItem({ clienteId: "cliente-2", name: "Cliente 2" })],
      total: 2,
    });
    listIntegrationsByTenantIdsMock.mockRejectedValue(new Error("timeout remoto"));
    getLastViewedAtMock.mockResolvedValue(null);

    const result = await InstagramReportsService.listClientsWithReports(1, 12, "user-1");

    expect(result.items).toHaveLength(2);
    expect(result.items.every((item) => item.integrationStatus === null)).toBe(true);
    expect(result.items.every((item) => item.username === null)).toBe(true);
  });

  it("isola falha ao buscar a última visualização de um cliente sem afetar os demais", async () => {
    listClientesComRelatoriosMock.mockResolvedValue({
      items: [summaryItem(), summaryItem({ clienteId: "cliente-2", name: "Cliente 2" })],
      total: 2,
    });
    listIntegrationsByTenantIdsMock.mockResolvedValue([]);
    getLastViewedAtMock
      .mockRejectedValueOnce(new Error("falha ao ler views"))
      .mockResolvedValueOnce("2026-01-01T00:00:00.000Z");

    const result = await InstagramReportsService.listClientsWithReports(1, 12, "user-1");

    expect(result.items).toHaveLength(2);
    expect(result.items[0].isNew).toBe(true);
    expect(result.items[1].isNew).toBe(true);
  });

  it("retorna lista vazia quando não há clientes com relatórios", async () => {
    listClientesComRelatoriosMock.mockResolvedValue({ items: [], total: 0 });

    const result = await InstagramReportsService.listClientsWithReports(1, 12, "user-1");

    expect(result).toEqual({ items: [], total: 0, page: 1, limit: 12 });
    expect(listIntegrationsByTenantIdsMock).not.toHaveBeenCalled();
  });
});
