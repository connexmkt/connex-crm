import type { SupabaseClient } from "@supabase/supabase-js";
import type { ReportStatus } from "@/lib/constants/instagram-reports";
import type { PostPayloadInput, ReportPostOutput } from "@/lib/types/instagram-reports";
import {
  listReportPosts,
  replaceReportPosts,
} from "@/lib/repositories/instagram-report-posts.helpers";

const REPORT_COLUMNS =
  "id, cliente_id, reference_year, reference_month, generated_at, status, followers_gained, followers_start, followers_end, followers_growth_pct, accounts_reached";

export interface MonthlyReportUpsertInput {
  sourceReportId: string;
  clienteId: string;
  referenceYear: number;
  referenceMonth: number;
  generatedAt: string;
  status: ReportStatus;
  topPosts?: PostPayloadInput[];
  worstPost?: PostPayloadInput | null;
  followersGained?: number | null;
  followersStart?: number | null;
  followersEnd?: number | null;
  followersGrowthPct?: number | null;
  accountsReached?: number | null;
}

export interface MonthlyReportUpsertResult {
  id: string;
  action: "created" | "updated";
}

export interface MonthlyMonthItem {
  year: number;
  month: number;
}

export interface MonthlyReportDetail {
  id: string;
  clienteId: string;
  referenceYear: number;
  referenceMonth: number;
  generatedAt: string;
  status: ReportStatus;
  followersGained: number | null;
  followersStart: number | null;
  followersEnd: number | null;
  followersGrowthPct: number | null;
  accountsReached: number | null;
  topPosts: ReportPostOutput[];
  worstPost: ReportPostOutput | null;
}

interface MonthlyReportRow {
  id: string;
  cliente_id: string;
  reference_year: number;
  reference_month: number;
  generated_at: string;
  status: string;
  followers_gained: number | null;
  followers_start: number | null;
  followers_end: number | null;
  followers_growth_pct: number | null;
  accounts_reached: number | null;
}

const TOP_POST_ROLES = ["TOP_1", "TOP_2", "TOP_3"] as const;

/**
 * Repository de `instagram_monthly_reports` (propriedade do connex-crm) —
 * ver data-model.md § `instagram_monthly_reports`.
 */
export const InstagramMonthlyReportsRepository = {
  async upsertBySourceReportId(
    admin: SupabaseClient,
    input: MonthlyReportUpsertInput,
  ): Promise<MonthlyReportUpsertResult> {
    const { data: existing, error: findError } = await admin
      .from("instagram_monthly_reports")
      .select("id")
      .eq("source_report_id", input.sourceReportId)
      .maybeSingle();

    if (findError) throw findError;

    const action: "created" | "updated" = existing ? "updated" : "created";

    const { data, error } = await admin
      .from("instagram_monthly_reports")
      .upsert(
        {
          cliente_id: input.clienteId,
          source_report_id: input.sourceReportId,
          reference_year: input.referenceYear,
          reference_month: input.referenceMonth,
          generated_at: input.generatedAt,
          status: input.status,
          followers_gained: input.followersGained ?? null,
          followers_start: input.followersStart ?? null,
          followers_end: input.followersEnd ?? null,
          followers_growth_pct: input.followersGrowthPct ?? null,
          accounts_reached: input.accountsReached ?? null,
        },
        { onConflict: "source_report_id" },
      )
      .select("id")
      .single();

    if (error) throw error;

    const reportId = (data as { id: string }).id;

    const posts: Array<{ role: "TOP_1" | "TOP_2" | "TOP_3" | "WORST" } & PostPayloadInput> = [];
    (input.topPosts ?? []).slice(0, 3).forEach((post, index) => {
      posts.push({ role: TOP_POST_ROLES[index], ...post });
    });
    if (input.worstPost) posts.push({ role: "WORST", ...input.worstPost });

    await replaceReportPosts(admin, "MONTHLY", "monthly_report_id", reportId, posts);

    return { id: reportId, action };
  },

  async listMonthsByCliente(
    supabase: SupabaseClient,
    clienteId: string,
    page: number,
    limit: number,
  ): Promise<{ items: MonthlyMonthItem[]; total: number }> {
    const from = (page - 1) * limit;
    const { data, error, count } = await supabase
      .from("instagram_monthly_reports")
      .select("reference_year, reference_month", { count: "exact" })
      .eq("cliente_id", clienteId)
      .order("reference_year", { ascending: false })
      .order("reference_month", { ascending: false })
      .range(from, from + limit - 1);

    if (error) throw error;

    const rows = (data ?? []) as Array<{
      reference_year: number;
      reference_month: number;
    }>;

    const items: MonthlyMonthItem[] = rows.map((row) => ({
      year: row.reference_year,
      month: row.reference_month,
    }));

    return { items, total: count ?? 0 };
  },

  async findByClienteAndReference(
    supabase: SupabaseClient,
    clienteId: string,
    year: number,
    month: number,
  ): Promise<MonthlyReportDetail | null> {
    const { data, error } = await supabase
      .from("instagram_monthly_reports")
      .select(REPORT_COLUMNS)
      .eq("cliente_id", clienteId)
      .eq("reference_year", year)
      .eq("reference_month", month)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const row = data as unknown as MonthlyReportRow;
    const posts = await listReportPosts(supabase, "monthly_report_id", row.id);
    const topPosts = TOP_POST_ROLES.map((role) =>
      posts.find((post) => post.role === role),
    ).filter((post): post is ReportPostOutput => post !== undefined);

    return {
      id: row.id,
      clienteId: row.cliente_id,
      referenceYear: row.reference_year,
      referenceMonth: row.reference_month,
      generatedAt: row.generated_at,
      status: row.status as ReportStatus,
      followersGained: row.followers_gained,
      followersStart: row.followers_start,
      followersEnd: row.followers_end,
      followersGrowthPct: row.followers_growth_pct,
      accountsReached: row.accounts_reached,
      topPosts,
      worstPost: posts.find((post) => post.role === "WORST") ?? null,
    };
  },
};
