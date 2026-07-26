import type { SupabaseClient } from "@supabase/supabase-js";
import type { ReportType } from "@/lib/constants/instagram-reports";
import { InstagramWeeklyReportsRepository } from "@/lib/repositories/instagram-weekly-reports.repository";
import { InstagramMonthlyReportsRepository } from "@/lib/repositories/instagram-monthly-reports.repository";
import type { WeeklyReportIngestInput } from "@/lib/schemas/instagram-reports/weekly-report-ingest.schema";
import type { MonthlyReportIngestInput } from "@/lib/schemas/instagram-reports/monthly-report-ingest.schema";

export type IngestionResult =
  | { status: "SUCCEEDED"; id: string; action: "created" | "updated" }
  | { status: "NOT_FOUND" }
  | { status: "FAILED" };

/**
 * Orquestra a ingestão idempotente de relatórios de Instagram (Insights →
 * CRM): valida `clienteId` existente, faz upsert via T009/T010 e loga
 * sucesso/falha com contexto (OBS-001). Nunca reinterpreta nem recalcula
 * nenhum valor recebido (FR-027).
 */
export const InstagramReportsIngestionService = {
  async ingestWeeklyReport(
    admin: SupabaseClient,
    input: WeeklyReportIngestInput,
  ): Promise<IngestionResult> {
    return runIngestion(admin, "WEEKLY", input.clienteId, input.sourceReportId, () =>
      InstagramWeeklyReportsRepository.upsertBySourceReportId(admin, input),
    );
  },

  async ingestMonthlyReport(
    admin: SupabaseClient,
    input: MonthlyReportIngestInput,
  ): Promise<IngestionResult> {
    return runIngestion(admin, "MONTHLY", input.clienteId, input.sourceReportId, () =>
      InstagramMonthlyReportsRepository.upsertBySourceReportId(admin, input),
    );
  },
};

async function runIngestion(
  admin: SupabaseClient,
  reportType: ReportType,
  clienteId: string,
  sourceReportId: string,
  upsert: () => Promise<{ id: string; action: "created" | "updated" }>,
): Promise<IngestionResult> {
  const exists = await clienteExists(admin, clienteId);
  if (!exists) {
    logIngestionEvent({
      reportType,
      clienteId,
      sourceReportId,
      success: false,
      reason: "cliente_not_found",
    });
    return { status: "NOT_FOUND" };
  }

  try {
    const { id, action } = await upsert();
    logIngestionEvent({ reportType, clienteId, sourceReportId, success: true, action });
    return { status: "SUCCEEDED", id, action };
  } catch (err) {
    logIngestionEvent({
      reportType,
      clienteId,
      sourceReportId,
      success: false,
      reason: "upsert_error",
      errorMessage: err instanceof Error ? err.message : String(err),
    });
    return { status: "FAILED" };
  }
}

async function clienteExists(admin: SupabaseClient, clienteId: string): Promise<boolean> {
  const { data, error } = await admin
    .from("clientes")
    .select("id")
    .eq("id", clienteId)
    .maybeSingle();

  if (error) throw error;
  return data !== null;
}

interface IngestionLogContext {
  reportType: ReportType;
  clienteId: string;
  sourceReportId: string;
  success: boolean;
  action?: "created" | "updated";
  reason?: string;
  errorMessage?: string;
}

/** Log estruturado de ingestão (OBS-001) — nunca usa `console.log` de debug. */
function logIngestionEvent(context: IngestionLogContext): void {
  const payload = JSON.stringify({ scope: "instagram-reports-ingestion", ...context });

  if (context.success) {
    console.info(payload);
  } else {
    console.error(payload);
  }
}
