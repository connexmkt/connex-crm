import type { SupabaseClient } from "@supabase/supabase-js";
import type { PostRole, ReportType } from "@/lib/constants/instagram-reports";
import type {
  PostPayloadInput,
  ReportPostOutput,
} from "@/lib/types/instagram-reports";

type ReportForeignKeyColumn = "weekly_report_id" | "monthly_report_id";

interface ReportPostRow {
  role: string;
  instagram_media_id: string;
  permalink: string | null;
  thumbnail_url: string | null;
  content_type: string | null;
  published_at: string | null;
  primary_metric_name: string | null;
  primary_metric_value: number | null;
  metrics: Record<string, unknown>;
}

const REPORT_POST_COLUMNS =
  "role, instagram_media_id, permalink, thumbnail_url, content_type, published_at, primary_metric_name, primary_metric_value, metrics";

function rowToPostOutput(row: ReportPostRow): ReportPostOutput {
  return {
    role: row.role as PostRole,
    instagramMediaId: row.instagram_media_id,
    permalink: row.permalink,
    thumbnailUrl: row.thumbnail_url,
    contentType: row.content_type,
    publishedAt: row.published_at,
    primaryMetricName: row.primary_metric_name,
    primaryMetricValue: row.primary_metric_value,
    metrics: row.metrics ?? {},
  };
}

/**
 * Substitui, de forma idempotente, as postagens associadas a um relatório
 * (semanal ou mensal): apaga as existentes para o `reportId` e insere as
 * novas. Usado após cada upsert de relatório (T009/T010) — nunca reinterpreta
 * nem recalcula os valores recebidos (FR-027).
 */
export async function replaceReportPosts(
  admin: SupabaseClient,
  reportType: ReportType,
  fkColumn: ReportForeignKeyColumn,
  reportId: string,
  posts: Array<{ role: PostRole } & PostPayloadInput>,
): Promise<void> {
  const { error: deleteError } = await admin
    .from("instagram_report_posts")
    .delete()
    .eq(fkColumn, reportId);
  if (deleteError) throw deleteError;

  if (posts.length === 0) return;

  const rows = posts.map((post) => ({
    report_type: reportType,
    [fkColumn]: reportId,
    role: post.role,
    instagram_media_id: post.instagramMediaId,
    permalink: post.permalink ?? null,
    thumbnail_url: post.thumbnailUrl ?? null,
    content_type: post.contentType ?? null,
    published_at: post.publishedAt ?? null,
    primary_metric_name: post.primaryMetricName ?? null,
    primary_metric_value: post.primaryMetricValue ?? null,
    metrics: post.metrics ?? {},
  }));

  const { error: insertError } = await admin
    .from("instagram_report_posts")
    .insert(rows);
  if (insertError) throw insertError;
}

/** Lê as postagens associadas a um relatório já persistido (leitura, RLS `authenticated`). */
export async function listReportPosts(
  supabase: SupabaseClient,
  fkColumn: ReportForeignKeyColumn,
  reportId: string,
): Promise<ReportPostOutput[]> {
  const { data, error } = await supabase
    .from("instagram_report_posts")
    .select(REPORT_POST_COLUMNS)
    .eq(fkColumn, reportId);

  if (error) throw error;
  return ((data ?? []) as unknown as ReportPostRow[]).map(rowToPostOutput);
}
