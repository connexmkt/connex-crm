import { createClient } from "@/lib/server";
import { createConnexInsightsAdminClient } from "@/lib/integrations/connex-insights/admin-client";
import { InstagramReportSummaryRepository } from "@/lib/repositories/instagram-report-summary.repository";
import { InstagramReportViewsRepository } from "@/lib/repositories/instagram-report-views.repository";
import { InstagramWeeklyReportsRepository } from "@/lib/repositories/instagram-weekly-reports.repository";
import { InstagramMonthlyReportsRepository } from "@/lib/repositories/instagram-monthly-reports.repository";
import type {
  WeeklyMonthItem,
  WeeklyWeekItem,
  WeeklyReportDetail,
} from "@/lib/repositories/instagram-weekly-reports.repository";
import type {
  MonthlyMonthItem,
  MonthlyReportDetail,
} from "@/lib/repositories/instagram-monthly-reports.repository";
import {
  fetchIntegrationsByTenantIds,
  type IntegrationLookupResult,
} from "@/lib/services/instagram-reports.service.helpers";

export interface ClientReportListItem {
  clienteId: string;
  name: string;
  logo: string | null;
  username: string | null;
  profilePictureUrl: string | null;
  integrationStatus: IntegrationLookupResult["status"];
  lastReportReferenceDate: string | null;
  isNew: boolean;
}

export interface ClientReportListPage {
  items: ClientReportListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface ClienteInstagramHeaderData {
  clienteId: string;
  name: string;
  logo: string | null;
  username: string | null;
  profilePictureUrl: string | null;
  integrationStatus: IntegrationLookupResult["status"];
  lastUpdatedAt: string | null;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
}

/**
 * Orquestra a leitura dos relatórios de Instagram já persistidos (Insights →
 * CRM): combina os repositories locais (relatórios/visualizações) com a
 * leitura remota, em lote, de `instagram_integrations` (research.md § D3).
 * Nunca reinterpreta nem recalcula nenhum valor recebido (FR-027).
 */
export const InstagramReportsService = {
  /**
   * Lista paginada dos clientes com ao menos um relatório disponível (US1).
   * Uma falha ao ler `instagram_integrations` em lote não interrompe a
   * listagem: os clientes afetados são exibidos com `integrationStatus: null`
   * (OBS-001) — FR-023.
   */
  async listClientsWithReports(
    page: number,
    limit: number,
    userId: string,
  ): Promise<ClientReportListPage> {
    const supabase = await createClient();
    const admin = createConnexInsightsAdminClient();

    const { items: summaryItems, total } =
      await InstagramReportSummaryRepository.listClientesComRelatorios(supabase, page, limit);

    const clienteIds = summaryItems.map((item) => item.clienteId);
    const integrationsByCliente = await fetchIntegrationsByTenantIds(admin, clienteIds);

    const items = await Promise.all(
      summaryItems.map(async (summary) => {
        const integration = integrationsByCliente.get(summary.clienteId) ?? {
          username: null,
          profilePictureUrl: null,
          status: null,
        };
        const lastViewedAt = await getLastViewedAtSafely(supabase, userId, summary.clienteId);

        return {
          clienteId: summary.clienteId,
          name: summary.name,
          logo: summary.logo,
          username: integration.username,
          profilePictureUrl: integration.profilePictureUrl,
          integrationStatus: integration.status,
          lastReportReferenceDate: summary.lastReportReferenceDate,
          isNew: computeIsNew(summary.lastReportReferenceDate, lastViewedAt),
        };
      }),
    );

    return { items, total, page, limit };
  },

  /** Cabeçalho da página do cliente: nome, conta do Instagram, avatar e última atualização (FR-006). */
  async getClienteHeader(clienteId: string): Promise<ClienteInstagramHeaderData | null> {
    const supabase = await createClient();
    const admin = createConnexInsightsAdminClient();

    const cliente = await InstagramReportSummaryRepository.getClienteBasicInfo(supabase, clienteId);
    if (!cliente) return null;

    const [integrationsByCliente, lastUpdatedAt] = await Promise.all([
      fetchIntegrationsByTenantIds(admin, [clienteId]),
      InstagramReportSummaryRepository.getLastGeneratedAtByCliente(supabase, clienteId),
    ]);

    const integration = integrationsByCliente.get(clienteId) ?? {
      username: null,
      profilePictureUrl: null,
      status: null,
    };

    return {
      clienteId,
      name: cliente.name,
      logo: cliente.logo,
      username: integration.username,
      profilePictureUrl: integration.profilePictureUrl,
      integrationStatus: integration.status,
      lastUpdatedAt,
    };
  },

  /** Meses com relatório semanal do cliente, mais recentes primeiro (FR-010/FR-018). */
  async listWeeklyMonths(
    clienteId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<WeeklyMonthItem>> {
    const supabase = await createClient();
    return InstagramWeeklyReportsRepository.listMonthsByCliente(supabase, clienteId, page, limit);
  },

  /** Semanas de um mês específico, ordinalmente decrescentes (FR-011). */
  async listWeeksForMonth(
    clienteId: string,
    year: number,
    month: number,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<WeeklyWeekItem>> {
    const supabase = await createClient();
    return InstagramWeeklyReportsRepository.listWeeksByClienteAndMonth(
      supabase,
      clienteId,
      year,
      month,
      page,
      limit,
    );
  },

  /** Conteúdo do relatório semanal (melhor/pior postagem) — FR-012/FR-013. */
  async getWeeklyReport(
    clienteId: string,
    year: number,
    month: number,
    week: number,
  ): Promise<WeeklyReportDetail | null> {
    const supabase = await createClient();
    return InstagramWeeklyReportsRepository.findByClienteAndReference(
      supabase,
      clienteId,
      year,
      month,
      week,
    );
  },

  /** Meses com relatório mensal do cliente, mais recentes primeiro (FR-014/FR-015). */
  async listMonthlyMonths(
    clienteId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<MonthlyMonthItem>> {
    const supabase = await createClient();
    return InstagramMonthlyReportsRepository.listMonthsByCliente(supabase, clienteId, page, limit);
  },

  /** Conteúdo do relatório mensal (top 3, pior postagem, seguidores, alcance) — FR-016. */
  async getMonthlyReport(
    clienteId: string,
    year: number,
    month: number,
  ): Promise<MonthlyReportDetail | null> {
    const supabase = await createClient();
    return InstagramMonthlyReportsRepository.findByClienteAndReference(supabase, clienteId, year, month);
  },
};

/**
 * "Novo" = existe relatório com período de referência mais recente do que a
 * última visualização do usuário para aquele cliente (Assumptions/FR-004).
 */
function computeIsNew(lastReportReferenceDate: string | null, lastViewedAt: string | null): boolean {
  if (!lastReportReferenceDate) return false;
  if (!lastViewedAt) return true;
  return new Date(lastReportReferenceDate).getTime() > new Date(lastViewedAt).getTime();
}

async function getLastViewedAtSafely(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  clienteId: string,
): Promise<string | null> {
  try {
    return await InstagramReportViewsRepository.getLastViewedAt(supabase, userId, clienteId);
  } catch (err) {
    console.error(
      JSON.stringify({
        scope: "instagram-reports-service",
        reason: "views_lookup_failed",
        clienteId,
        errorMessage: err instanceof Error ? err.message : String(err),
      }),
    );
    return null;
  }
}
