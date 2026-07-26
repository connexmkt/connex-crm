import type { SupabaseClient } from "@supabase/supabase-js";
import type { ReportStatus } from "@/lib/constants/instagram-reports";
import type { PostPayloadInput, ReportPostOutput } from "@/lib/types/instagram-reports";
import {
  listReportPosts,
  replaceReportPosts,
} from "@/lib/repositories/instagram-report-posts.helpers";

const REPORT_COLUMNS =
  "id, cliente_id, reference_year, reference_month, reference_week, period_start, period_end, generated_at, status";

export interface WeeklyReportUpsertInput {
  sourceReportId: string;
  clienteId: string;
  referenceYear: number;
  referenceMonth: number;
  referenceWeek: number;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  status: ReportStatus;
  bestPost?: PostPayloadInput | null;
  worstPost?: PostPayloadInput | null;
}

export interface WeeklyReportUpsertResult {
  id: string;
  action: "created" | "updated";
}

export interface WeeklyMonthItem {
  year: number;
  month: number;
}

export interface WeeklyWeekItem {
  week: number;
  periodStart: string;
  periodEnd: string;
  status: ReportStatus;
  generatedAt: string;
}

export interface WeeklyReportDetail {
  id: string;
  clienteId: string;
  referenceYear: number;
  referenceMonth: number;
  referenceWeek: number;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  status: ReportStatus;
  bestPost: ReportPostOutput | null;
  worstPost: ReportPostOutput | null;
}

interface WeeklyReportRow {
  id: string;
  cliente_id: string;
  reference_year: number;
  reference_month: number;
  reference_week: number;
  period_start: string;
  period_end: string;
  generated_at: string;
  status: string;
}

/**
 * Repository de `instagram_weekly_reports` (propriedade do connex-crm) —
 * ver data-model.md § `instagram_weekly_reports`.
 */
export const InstagramWeeklyReportsRepository = {
  async upsertBySourceReportId(
    admin: SupabaseClient,
    input: WeeklyReportUpsertInput,
  ): Promise<WeeklyReportUpsertResult> {
    const { data: existing, error: findError } = await admin
      .from("instagram_weekly_reports")
      .select("id")
      .eq("source_report_id", input.sourceReportId)
      .maybeSingle();

    if (findError) throw findError;

    const action: "created" | "updated" = existing ? "updated" : "created";

    const { data, error } = await admin
      .from("instagram_weekly_reports")
      .upsert(
        {
          cliente_id: input.clienteId,
          source_report_id: input.sourceReportId,
          reference_year: input.referenceYear,
          reference_month: input.referenceMonth,
          reference_week: input.referenceWeek,
          period_start: input.periodStart,
          period_end: input.periodEnd,
          generated_at: input.generatedAt,
          status: input.status,
        },
        { onConflict: "source_report_id" },
      )
      .select("id")
      .single();

    if (error) throw error;

    const reportId = (data as { id: string }).id;

    const posts: Array<{ role: "BEST" | "WORST" } & PostPayloadInput> = [];
    if (input.bestPost) posts.push({ role: "BEST", ...input.bestPost });
    if (input.worstPost) posts.push({ role: "WORST", ...input.worstPost });

    await replaceReportPosts(admin, "WEEKLY", "weekly_report_id", reportId, posts);

    return { id: reportId, action };
  },

  /**
   * Meses distintos (ano/mês) com relatório semanal para o cliente, mais
   * recentes primeiro (FR-010/FR-018). Sem função de agregação nativa para
   * `DISTINCT` paginado no PostgREST — dedup em memória, volume limitado a
   * poucas centenas de relatórios por cliente (plan.md § Scale/Scope).
   */
  async listMonthsByCliente(
    supabase: SupabaseClient,
    clienteId: string,
    page: number,
    limit: number,
  ): Promise<{ items: WeeklyMonthItem[]; total: number }> {
    const { data, error } = await supabase
      .from("instagram_weekly_reports")
      .select("reference_year, reference_month")
      .eq("cliente_id", clienteId)
      .order("reference_year", { ascending: false })
      .order("reference_month", { ascending: false });

    if (error) throw error;

    const rows = (data ?? []) as Array<{
      reference_year: number;
      reference_month: number;
    }>;

    const seen = new Set<string>();
    const months: WeeklyMonthItem[] = [];
    for (const row of rows) {
      const key = `${row.reference_year}-${row.reference_month}`;
      if (seen.has(key)) continue;
      seen.add(key);
      months.push({ year: row.reference_year, month: row.reference_month });
    }

    const from = (page - 1) * limit;
    return { items: months.slice(from, from + limit), total: months.length };
  },

  async listWeeksByClienteAndMonth(
    supabase: SupabaseClient,
    clienteId: string,
    year: number,
    month: number,
    page: number,
    limit: number,
  ): Promise<{ items: WeeklyWeekItem[]; total: number }> {
    const from = (page - 1) * limit;
    const { data, error, count } = await supabase
      .from("instagram_weekly_reports")
      .select(
        "reference_week, period_start, period_end, status, generated_at",
        { count: "exact" },
      )
      .eq("cliente_id", clienteId)
      .eq("reference_year", year)
      .eq("reference_month", month)
      .order("reference_week", { ascending: false })
      .range(from, from + limit - 1);

    if (error) throw error;

    const rows = (data ?? []) as Array<{
      reference_week: number;
      period_start: string;
      period_end: string;
      status: string;
      generated_at: string;
    }>;

    const items: WeeklyWeekItem[] = rows.map((row) => ({
      week: row.reference_week,
      periodStart: row.period_start,
      periodEnd: row.period_end,
      status: row.status as ReportStatus,
      generatedAt: row.generated_at,
    }));

    return { items, total: count ?? 0 };
  },

  async findByClienteAndReference(
    supabase: SupabaseClient,
    clienteId: string,
    year: number,
    month: number,
    week: number,
  ): Promise<WeeklyReportDetail | null> {
    const { data, error } = await supabase
      .from("instagram_weekly_reports")
      .select(REPORT_COLUMNS)
      .eq("cliente_id", clienteId)
      .eq("reference_year", year)
      .eq("reference_month", month)
      .eq("reference_week", week)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const row = data as unknown as WeeklyReportRow;
    const posts = await listReportPosts(supabase, "weekly_report_id", row.id);

    return {
      id: row.id,
      clienteId: row.cliente_id,
      referenceYear: row.reference_year,
      referenceMonth: row.reference_month,
      referenceWeek: row.reference_week,
      periodStart: row.period_start,
      periodEnd: row.period_end,
      generatedAt: row.generated_at,
      status: row.status as ReportStatus,
      bestPost: posts.find((post) => post.role === "BEST") ?? null,
      worstPost: posts.find((post) => post.role === "WORST") ?? null,
    };
  },
};
