import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { InstagramReportSummaryRepository } from "@/lib/repositories/instagram-report-summary.repository";

interface SummaryRow {
  cliente_id: string;
  last_report_reference_date: string | null;
  last_generated_at: string | null;
  has_weekly_reports: boolean;
  has_monthly_reports: boolean;
}

interface ClienteRow {
  id: string;
  name: string;
  logo: string | null;
}

function createMock(summaryRows: SummaryRow[], clienteRows: ClienteRow[], total: number) {
  const rangeFn = vi.fn(async () => ({ data: summaryRows, error: null, count: total }));
  const orderFn = vi.fn(() => ({ range: rangeFn }));
  const selectForSummary = vi.fn(() => ({ order: orderFn }));

  const inFn = vi.fn(async () => ({ data: clienteRows, error: null }));
  const selectForClientes = vi.fn(() => ({ in: inFn }));

  const fromFn = vi.fn((table: string) => {
    if (table === "instagram_client_report_summary") {
      return { select: selectForSummary };
    }
    if (table === "clientes") {
      return { select: selectForClientes };
    }
    throw new Error(`Tabela inesperada no mock: ${table}`);
  });

  const client = { from: fromFn } as unknown as SupabaseClient;
  return { client, orderFn, rangeFn, inFn };
}

describe("InstagramReportSummaryRepository.listClientesComRelatorios", () => {
  it("ordena pela view por last_report_reference_date decrescente e pagina com range", async () => {
    const { client, orderFn, rangeFn } = createMock(
      [
        {
          cliente_id: "cliente-1",
          last_report_reference_date: "2026-07-20",
          last_generated_at: "2026-07-21T00:00:00.000Z",
          has_weekly_reports: true,
          has_monthly_reports: false,
        },
      ],
      [{ id: "cliente-1", name: "Cliente 1", logo: null }],
      1,
    );

    const result = await InstagramReportSummaryRepository.listClientesComRelatorios(client, 2, 5);

    expect(orderFn).toHaveBeenCalledWith("last_report_reference_date", { ascending: false });
    expect(rangeFn).toHaveBeenCalledWith(5, 9);
    expect(result).toEqual({
      items: [
        {
          clienteId: "cliente-1",
          name: "Cliente 1",
          logo: null,
          lastReportReferenceDate: "2026-07-20",
          lastGeneratedAt: "2026-07-21T00:00:00.000Z",
          hasWeeklyReports: true,
          hasMonthlyReports: false,
        },
      ],
      total: 1,
    });
  });

  it("resolve nome/logo do cliente em uma única consulta em lote (sem N+1)", async () => {
    const { client, inFn } = createMock(
      [
        {
          cliente_id: "cliente-1",
          last_report_reference_date: "2026-07-20",
          last_generated_at: "2026-07-21T00:00:00.000Z",
          has_weekly_reports: true,
          has_monthly_reports: true,
        },
        {
          cliente_id: "cliente-2",
          last_report_reference_date: "2026-07-10",
          last_generated_at: "2026-07-11T00:00:00.000Z",
          has_weekly_reports: false,
          has_monthly_reports: true,
        },
      ],
      [
        { id: "cliente-1", name: "Cliente 1", logo: "logo-1.png" },
        { id: "cliente-2", name: "Cliente 2", logo: null },
      ],
      2,
    );

    await InstagramReportSummaryRepository.listClientesComRelatorios(client, 1, 10);

    expect(inFn).toHaveBeenCalledOnce();
    expect(inFn).toHaveBeenCalledWith("id", ["cliente-1", "cliente-2"]);
  });

  it("retorna lista vazia sem consultar clientes quando a view não retorna linhas", async () => {
    const { client, inFn } = createMock([], [], 0);

    const result = await InstagramReportSummaryRepository.listClientesComRelatorios(client, 1, 10);

    expect(result).toEqual({ items: [], total: 0 });
    expect(inFn).not.toHaveBeenCalled();
  });
});

describe("InstagramReportSummaryRepository.getClienteBasicInfo", () => {
  it("retorna nome/logo quando o cliente existe", async () => {
    const maybeSingle = vi.fn(async () => ({
      data: { name: "Cliente 1", logo: "logo.png" },
      error: null,
    }));
    const eqFn = vi.fn(() => ({ maybeSingle }));
    const selectFn = vi.fn(() => ({ eq: eqFn }));
    const client = { from: vi.fn(() => ({ select: selectFn })) } as unknown as SupabaseClient;

    const result = await InstagramReportSummaryRepository.getClienteBasicInfo(client, "cliente-1");

    expect(result).toEqual({ name: "Cliente 1", logo: "logo.png" });
  });

  it("retorna null quando o cliente não existe", async () => {
    const maybeSingle = vi.fn(async () => ({ data: null, error: null }));
    const eqFn = vi.fn(() => ({ maybeSingle }));
    const selectFn = vi.fn(() => ({ eq: eqFn }));
    const client = { from: vi.fn(() => ({ select: selectFn })) } as unknown as SupabaseClient;

    const result = await InstagramReportSummaryRepository.getClienteBasicInfo(client, "cliente-inexistente");

    expect(result).toBeNull();
  });
});
