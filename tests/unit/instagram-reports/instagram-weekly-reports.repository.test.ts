import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { InstagramWeeklyReportsRepository } from "@/lib/repositories/instagram-weekly-reports.repository";

function createAdminMock(options: { existingId?: string | null } = {}) {
  const maybeSingle = vi.fn(async () => ({
    data: options.existingId ? { id: options.existingId } : null,
    error: null,
  }));
  const eqForFind = vi.fn(() => ({ maybeSingle }));
  const selectForFind = vi.fn(() => ({ eq: eqForFind }));

  const single = vi.fn(async () => ({ data: { id: "report-1" }, error: null }));
  const selectForUpsert = vi.fn(() => ({ single }));
  const upsertFn = vi.fn(() => ({ select: selectForUpsert }));

  const deleteEq = vi.fn(async () => ({ error: null }));
  const deleteFn = vi.fn(() => ({ eq: deleteEq }));
  const insertFn = vi.fn(async () => ({ error: null }));

  const fromFn = vi.fn((table: string) => {
    if (table === "instagram_weekly_reports") {
      return { select: selectForFind, upsert: upsertFn };
    }
    if (table === "instagram_report_posts") {
      return { delete: deleteFn, insert: insertFn };
    }
    throw new Error(`Tabela inesperada no mock: ${table}`);
  });

  const client = { from: fromFn } as unknown as SupabaseClient;

  return { client, eqForFind, upsertFn, selectForUpsert, deleteFn, deleteEq, insertFn };
}

const baseInput = {
  sourceReportId: "src-1",
  clienteId: "cliente-1",
  referenceYear: 2026,
  referenceMonth: 7,
  referenceWeek: 4,
  periodStart: "2026-07-20",
  periodEnd: "2026-07-26",
  generatedAt: "2026-07-26T10:00:00.000Z",
  status: "AVAILABLE" as const,
};

describe("InstagramWeeklyReportsRepository.upsertBySourceReportId", () => {
  it("retorna action 'created' quando source_report_id ainda não existe", async () => {
    const { client, upsertFn } = createAdminMock({ existingId: null });

    const result = await InstagramWeeklyReportsRepository.upsertBySourceReportId(
      client,
      baseInput,
    );

    expect(result).toEqual({ id: "report-1", action: "created" });
    expect(upsertFn).toHaveBeenCalledWith(
      expect.objectContaining({ source_report_id: "src-1", cliente_id: "cliente-1" }),
      { onConflict: "source_report_id" },
    );
  });

  it("retorna action 'updated' quando source_report_id já existe", async () => {
    const { client } = createAdminMock({ existingId: "report-1" });

    const result = await InstagramWeeklyReportsRepository.upsertBySourceReportId(
      client,
      baseInput,
    );

    expect(result).toEqual({ id: "report-1", action: "updated" });
  });

  it("substitui as postagens BEST/WORST: apaga antes de inserir as novas", async () => {
    const { client, deleteFn, deleteEq, insertFn } = createAdminMock({ existingId: null });

    await InstagramWeeklyReportsRepository.upsertBySourceReportId(client, {
      ...baseInput,
      bestPost: { instagramMediaId: "media-best" },
      worstPost: { instagramMediaId: "media-worst" },
    });

    expect(deleteFn).toHaveBeenCalled();
    expect(deleteEq).toHaveBeenCalledWith("weekly_report_id", "report-1");
    expect(insertFn).toHaveBeenCalledWith([
      expect.objectContaining({ role: "BEST", instagram_media_id: "media-best" }),
      expect.objectContaining({ role: "WORST", instagram_media_id: "media-worst" }),
    ]);
  });

  it("não insere postagens quando bestPost/worstPost estão ausentes", async () => {
    const { client, insertFn } = createAdminMock({ existingId: null });

    await InstagramWeeklyReportsRepository.upsertBySourceReportId(client, baseInput);

    expect(insertFn).not.toHaveBeenCalled();
  });
});

describe("InstagramWeeklyReportsRepository.listMonthsByCliente", () => {
  function createReadOnlyMock(rows: Array<{ reference_year: number; reference_month: number }>) {
    const orderSecond = vi.fn(async () => ({ data: rows, error: null }));
    const orderFirst = vi.fn(() => ({ order: orderSecond }));
    const eqFn = vi.fn(() => ({ order: orderFirst }));
    const selectFn = vi.fn(() => ({ eq: eqFn }));
    const fromFn = vi.fn(() => ({ select: selectFn }));

    return { client: { from: fromFn } as unknown as SupabaseClient, selectFn, eqFn };
  }

  it("deduplica meses repetidos (várias semanas no mesmo mês) e ordena decrescente", async () => {
    const { client } = createReadOnlyMock([
      { reference_year: 2026, reference_month: 7 },
      { reference_year: 2026, reference_month: 7 },
      { reference_year: 2026, reference_month: 6 },
    ]);

    const result = await InstagramWeeklyReportsRepository.listMonthsByCliente(
      client,
      "cliente-1",
      1,
      10,
    );

    expect(result).toEqual({
      items: [
        { year: 2026, month: 7 },
        { year: 2026, month: 6 },
      ],
      total: 2,
    });
  });

  it("pagina a lista de meses já deduplicada", async () => {
    const { client } = createReadOnlyMock([
      { reference_year: 2026, reference_month: 7 },
      { reference_year: 2026, reference_month: 6 },
      { reference_year: 2026, reference_month: 5 },
    ]);

    const result = await InstagramWeeklyReportsRepository.listMonthsByCliente(
      client,
      "cliente-1",
      2,
      1,
    );

    expect(result).toEqual({
      items: [{ year: 2026, month: 6 }],
      total: 3,
    });
  });

  it("retorna lista vazia quando o cliente não possui relatórios semanais", async () => {
    const { client } = createReadOnlyMock([]);

    const result = await InstagramWeeklyReportsRepository.listMonthsByCliente(
      client,
      "cliente-sem-relatorios",
      1,
      10,
    );

    expect(result).toEqual({ items: [], total: 0 });
  });
});
