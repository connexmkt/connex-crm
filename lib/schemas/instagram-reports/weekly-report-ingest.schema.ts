import { z } from "zod";
import { REPORT_STATUSES } from "@/lib/constants/instagram-reports";
import { postPayloadSchema } from "@/lib/schemas/instagram-reports/post-payload.schema";

/**
 * Espelha `WeeklyReportIngestRequest` do contrato
 * (specs/003-relatorios-instagram-crm/contracts/instagram-reports-ingestion-api.yaml).
 */
export const weeklyReportIngestSchema = z
  .object({
    sourceReportId: z.string().min(1, "sourceReportId é obrigatório"),
    clienteId: z.string().uuid("clienteId deve ser um UUID válido"),
    referenceYear: z.number().int().min(2020).max(2100),
    referenceMonth: z.number().int().min(1).max(12),
    referenceWeek: z.number().int().min(1).max(5),
    periodStart: z.string().date(),
    periodEnd: z.string().date(),
    generatedAt: z.string().datetime(),
    status: z.enum(REPORT_STATUSES),
    bestPost: postPayloadSchema.nullable().optional(),
    worstPost: postPayloadSchema.nullable().optional(),
  })
  .refine((data) => data.periodStart <= data.periodEnd, {
    message: "periodStart deve ser anterior ou igual a periodEnd",
    path: ["periodEnd"],
  });

export type WeeklyReportIngestInput = z.infer<typeof weeklyReportIngestSchema>;
