import type { SupabaseClient } from "@supabase/supabase-js";

export interface ClienteComRelatoriosItem {
  clienteId: string;
  name: string;
  logo: string | null;
  lastReportReferenceDate: string | null;
  lastGeneratedAt: string | null;
  hasWeeklyReports: boolean;
  hasMonthlyReports: boolean;
}

interface SummaryRow {
  cliente_id: string;
  last_report_reference_date: string | null;
  last_generated_at: string | null;
  has_weekly_reports: boolean;
  has_monthly_reports: boolean;
}

interface ClienteNameLogoRow {
  id: string;
  name: string;
  logo: string | null;
}

/**
 * Repository de leitura da view `instagram_client_report_summary`
 * (data-model.md § VIEW) — a view já filtra apenas clientes com ao menos um
 * relatório (`GROUP BY cliente_id` sobre as tabelas de relatório), portanto
 * consultá-la diretamente equivale ao `EXISTS` descrito no plano. O nome e
 * logo do cliente são resolvidos em uma segunda consulta em lote (sem N+1).
 */
export const InstagramReportSummaryRepository = {
  async listClientesComRelatorios(
    supabase: SupabaseClient,
    page: number,
    limit: number,
  ): Promise<{ items: ClienteComRelatoriosItem[]; total: number }> {
    const from = (page - 1) * limit;
    const { data, error, count } = await supabase
      .from("instagram_client_report_summary")
      .select(
        "cliente_id, last_report_reference_date, last_generated_at, has_weekly_reports, has_monthly_reports",
        { count: "exact" },
      )
      .order("last_report_reference_date", { ascending: false })
      .range(from, from + limit - 1);

    if (error) throw error;

    const summaryRows = (data ?? []) as SummaryRow[];
    const clienteIds = summaryRows.map((row) => row.cliente_id);
    const clientesById = await fetchClientesById(supabase, clienteIds);

    const items: ClienteComRelatoriosItem[] = summaryRows.map((row) => {
      const cliente = clientesById.get(row.cliente_id);
      return {
        clienteId: row.cliente_id,
        name: cliente?.name ?? "—",
        logo: cliente?.logo ?? null,
        lastReportReferenceDate: row.last_report_reference_date,
        lastGeneratedAt: row.last_generated_at,
        hasWeeklyReports: row.has_weekly_reports,
        hasMonthlyReports: row.has_monthly_reports,
      };
    });

    return { items, total: count ?? 0 };
  },

  /** Nome/logo de um único cliente — usado pelo header da página do cliente (FR-006). */
  async getClienteBasicInfo(
    supabase: SupabaseClient,
    clienteId: string,
  ): Promise<{ name: string; logo: string | null } | null> {
    const { data, error } = await supabase
      .from("clientes")
      .select("name, logo")
      .eq("id", clienteId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return data as { name: string; logo: string | null };
  },

  /**
   * Resumo (`last_generated_at`) de um único cliente na view — usado para a
   * "última atualização dos dados" exibida no header do cliente (FR-006).
   * Retorna `null` quando o cliente não possui nenhum relatório ainda.
   */
  async getLastGeneratedAtByCliente(
    supabase: SupabaseClient,
    clienteId: string,
  ): Promise<string | null> {
    const { data, error } = await supabase
      .from("instagram_client_report_summary")
      .select("last_generated_at")
      .eq("cliente_id", clienteId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return (data as { last_generated_at: string | null }).last_generated_at;
  },
};

async function fetchClientesById(
  supabase: SupabaseClient,
  clienteIds: string[],
): Promise<Map<string, ClienteNameLogoRow>> {
  if (clienteIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from("clientes")
    .select("id, name, logo")
    .in("id", clienteIds);

  if (error) throw error;

  const rows = (data ?? []) as ClienteNameLogoRow[];
  return new Map(rows.map((row) => [row.id, row]));
}
