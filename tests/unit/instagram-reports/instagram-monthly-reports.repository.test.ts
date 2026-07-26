import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { InstagramMonthlyReportsRepository } from "@/lib/repositories/instagram-monthly-reports.repository";

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
    if (table === "instagram_monthly_reports") {
      return { select: selectForFind, upsert: upsertFn };
    }
    if (table === "instagram_report_posts") {
      return { delete: deleteFn, insert: insertFn };
    }
    throw new Error(`Tabela inesperada no mock: ${table}`);
  });

  const client = { from: fromFn } as unknown as SupabaseClient;

  return { client, upsertFn, deleteFn, deleteEq, insertFn };
}

const baseInput = {
  sourceReportId: "src-1",
  clienteId: "cliente-1",
  referenceYear: 2026,
  referenceMonth: 7,
  generatedAt: "2026-07-26T10:00:00.000Z",
  status: "AVAILABLE" as const,
};

describe("InstagramMonthlyReportsRepository.upsertBySourceReportId", () => {
  it("retorna action 'created' quando source_report_id ainda não existe", async () => {
    const { client, upsertFn } = createAdminMock({ existingId: null });

    const result = await InstagramMonthlyReportsRepository.upsertBySourceReportId(
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

    const result = await InstagramMonthlyReportsRepository.upsertBySourceReportId(
      client,
      baseInput,
    );

    expect(result).toEqual({ id: "report-1", action: "updated" });
  });

  it("mantém a ordem do ranking em topPosts (índice 0 = TOP_1) e inclui worstPost", async () => {
    const { client, deleteEq, insertFn } = createAdminMock({ existingId: null });

    await InstagramMonthlyReportsRepository.upsertBySourceReportId(client, {
      ...baseInput,
      topPosts: [
        { instagramMediaId: "media-1" },
        { instagramMediaId: "media-2" },
        { instagramMediaId: "media-3" },
      ],
      worstPost: { instagramMediaId: "media-worst" },
    });

    expect(deleteEq).toHaveBeenCalledWith("monthly_report_id", "report-1");
    expect(insertFn).toHaveBeenCalledWith([
      expect.objectContaining({ role: "TOP_1", instagram_media_id: "media-1" }),
      expect.objectContaining({ role: "TOP_2", instagram_media_id: "media-2" }),
      expect.objectContaining({ role: "TOP_3", instagram_media_id: "media-3" }),
      expect.objectContaining({ role: "WORST", instagram_media_id: "media-worst" }),
    ]);
  });

  it("não insere postagens quando topPosts/worstPost estão ausentes", async () => {
    const { client, insertFn } = createAdminMock({ existingId: null });

    await InstagramMonthlyReportsRepository.upsertBySourceReportId(client, baseInput);

    expect(insertFn).not.toHaveBeenCalled();
  });
});

describe("InstagramMonthlyReportsRepository.listMonthsByCliente", () => {
  function createReadOnlyMock(
    rows: Array<{ reference_year: number; reference_month: number }>,
    total: number,
  ) {
    const range = vi.fn(async () => ({ data: rows, error: null, count: total }));
    const orderSecond = vi.fn(() => ({ range }));
    const orderFirst = vi.fn(() => ({ order: orderSecond }));
    const eqFn = vi.fn(() => ({ order: orderFirst }));
    const selectFn = vi.fn(() => ({ eq: eqFn }));
    const fromFn = vi.fn(() => ({ select: selectFn }));

    return { client: { from: fromFn } as unknown as SupabaseClient, selectFn, range };
  }

  it("retorna items e total no formato paginado esperado", async () => {
    const { client, selectFn, range } = createReadOnlyMock(
      [
        { reference_year: 2026, reference_month: 7 },
        { reference_year: 2026, reference_month: 6 },
      ],
      5,
    );

    const result = await InstagramMonthlyReportsRepository.listMonthsByCliente(
      client,
      "cliente-1",
      1,
      2,
    );

    expect(result).toEqual({
      items: [
        { year: 2026, month: 7 },
        { year: 2026, month: 6 },
      ],
      total: 5,
    });
    expect(selectFn).toHaveBeenCalledWith("reference_year, reference_month", {
      count: "exact",
    });
    expect(range).toHaveBeenCalledWith(0, 1);
  });

  it("calcula o range corretamente para páginas além da primeira", async () => {
    const { client, range } = createReadOnlyMock([], 0);

    await InstagramMonthlyReportsRepository.listMonthsByCliente(client, "cliente-1", 3, 10);

    expect(range).toHaveBeenCalledWith(20, 29);
  });
});
