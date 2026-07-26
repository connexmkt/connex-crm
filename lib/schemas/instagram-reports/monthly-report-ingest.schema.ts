import { z } from "zod";
import { REPORT_STATUSES } from "@/lib/constants/instagram-reports";
import { postPayloadSchema } from "@/lib/schemas/instagram-reports/post-payload.schema";

/**
 * Espelha `MonthlyReportIngestRequest` do contrato
 * (specs/003-relatorios-instagram-crm/contracts/instagram-reports-ingestion-api.yaml).
 * `topPosts` — ordem = ranking (índice 0 é o Top 1), nunca recalculado pelo CRM (FR-027).
 */
export const monthlyReportIngestSchema = z.object({
  sourceReportId: z.string().min(1, "sourceReportId é obrigatório"),
  clienteId: z.string().uuid("clienteId deve ser um UUID válido"),
  referenceYear: z.number().int().min(2020).max(2100),
  referenceMonth: z.number().int().min(1).max(12),
  generatedAt: z.string().datetime(),
  status: z.enum(REPORT_STATUSES),
  topPosts: z.array(postPayloadSchema).max(3).optional(),
  worstPost: postPayloadSchema.nullable().optional(),
  followersGained: z.number().int().nullable().optional(),
  followersStart: z.number().int().nullable().optional(),
  followersEnd: z.number().int().nullable().optional(),
  followersGrowthPct: z.number().nullable().optional(),
  accountsReached: z.number().int().nullable().optional(),
});

export type MonthlyReportIngestInput = z.infer<typeof monthlyReportIngestSchema>;
