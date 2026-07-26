import { z } from "zod";

/**
 * Forma de uma postagem dentro de um payload de ingestão — compartilhada
 * entre os schemas semanal e mensal (data-model.md § Validação). Apenas
 * garante forma/tipo; nunca reinterpreta valores recebidos (FR-027).
 */
export const postPayloadSchema = z.object({
  instagramMediaId: z.string().min(1, "instagramMediaId é obrigatório"),
  permalink: z.string().url().nullable().optional(),
  thumbnailUrl: z.string().url().nullable().optional(),
  contentType: z.string().nullable().optional(),
  publishedAt: z.string().datetime().nullable().optional(),
  primaryMetricName: z.string().nullable().optional(),
  primaryMetricValue: z.number().nullable().optional(),
  metrics: z.record(z.string(), z.unknown()).optional(),
});

export type PostPayload = z.infer<typeof postPayloadSchema>;
