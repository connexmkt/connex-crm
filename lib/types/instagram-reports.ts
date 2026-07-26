import type {
  InstagramIntegrationStatus,
  PostRole,
} from "@/lib/constants/instagram-reports";

/**
 * Forma de uma postagem dentro de um payload de ingestão (semanal ou
 * mensal) — compartilhada entre os schemas Zod (`lib/schemas/instagram-reports/**`)
 * e os repositories de relatório (`instagram-{weekly,monthly}-reports.repository.ts`),
 * evitando duplicar a mesma forma em múltiplos arquivos. Nunca reinterpreta
 * nem recalcula valores recebidos do Connex Insights (FR-027).
 */
export interface PostPayloadInput {
  instagramMediaId: string;
  permalink?: string | null;
  thumbnailUrl?: string | null;
  contentType?: string | null;
  publishedAt?: string | null;
  primaryMetricName?: string | null;
  primaryMetricValue?: number | null;
  metrics?: Record<string, unknown>;
}

/** Postagem já persistida, no formato exposto pelos repositories de leitura. */
export interface ReportPostOutput {
  role: PostRole;
  instagramMediaId: string;
  permalink: string | null;
  thumbnailUrl: string | null;
  contentType: string | null;
  publishedAt: string | null;
  primaryMetricName: string | null;
  primaryMetricValue: number | null;
  metrics: Record<string, unknown>;
}

/** Resumo de `instagram_integrations` (Insights) lido em lote por `tenant_id`. */
export interface ConnexInsightsIntegrationSummary {
  tenantId: string;
  username: string | null;
  profilePictureUrl: string | null;
  status: InstagramIntegrationStatus;
}

