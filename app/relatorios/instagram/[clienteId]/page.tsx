import { notFound } from "next/navigation";
import { requireAuthOrRedirect } from "@/lib/auth/require-auth";
import { AppShell } from "@/components/layout";
import { createClient } from "@/lib/server";
import { InstagramReportsService } from "@/lib/services/instagram-reports.service";
import { InstagramReportViewsRepository } from "@/lib/repositories/instagram-report-views.repository";
import { parsePaginationParam } from "@/lib/utils/pagination";
import { ClienteInstagramHeader } from "./components/ClienteInstagramHeader";
import { InstagramReportTabs } from "./components/InstagramReportTabs";
import { MonthGrid } from "./components/MonthGrid";

const MONTHS_LIMIT = 12;

interface ClienteInstagramPageProps {
  params: Promise<{ clienteId: string }>;
  searchParams: Promise<{ semanaisPage?: string; mensaisPage?: string }>;
}

/** Página do cliente: header + tabs Semanais/Mensais (FR-006/FR-007/US2/US3). */
export default async function ClienteInstagramPage({ params, searchParams }: ClienteInstagramPageProps) {
  const { userId } = await requireAuthOrRedirect();
  const { clienteId } = await params;
  const query = await searchParams;

  const header = await InstagramReportsService.getClienteHeader(clienteId);
  if (!header) notFound();

  const semanaisPage = parsePaginationParam(query.semanaisPage, 1);
  const mensaisPage = parsePaginationParam(query.mensaisPage, 1);

  const [weeklyMonths, monthlyMonths] = await Promise.all([
    InstagramReportsService.listWeeklyMonths(clienteId, semanaisPage, MONTHS_LIMIT),
    InstagramReportsService.listMonthlyMonths(clienteId, mensaisPage, MONTHS_LIMIT),
  ]);

  await registerView(clienteId, userId);

  const basePath = `/relatorios/instagram/${clienteId}`;

  return (
    <AppShell title={header.name}>
      <div className="space-y-6">
        <ClienteInstagramHeader header={header} />
        <InstagramReportTabs
          clienteId={clienteId}
          weeklyContent={
            <MonthGrid
              months={weeklyMonths.items}
              total={weeklyMonths.total}
              page={semanaisPage}
              limit={MONTHS_LIMIT}
              monthBasePath={`${basePath}/semanais`}
              paginationBasePath={basePath}
              pageParam="semanaisPage"
              extraParams={{ mensaisPage }}
              emptyMessage="Nenhum relatório semanal disponível."
            />
          }
          monthlyContent={
            <MonthGrid
              months={monthlyMonths.items}
              total={monthlyMonths.total}
              page={mensaisPage}
              limit={MONTHS_LIMIT}
              monthBasePath={`${basePath}/mensais`}
              paginationBasePath={basePath}
              pageParam="mensaisPage"
              extraParams={{ semanaisPage }}
              emptyMessage="Nenhum relatório mensal disponível."
            />
          }
        />
      </div>
    </AppShell>
  );
}

/**
 * Atualiza `instagram_report_views` para este usuário/cliente (FR-004) — o
 * indicador de "novo" na lista de clientes considera esse timestamp. Uma
 * falha aqui não deve impedir a renderização da página (best-effort, OBS-001).
 */
async function registerView(clienteId: string, userId: string): Promise<void> {
  try {
    const supabase = await createClient();
    await InstagramReportViewsRepository.upsertViewedNow(supabase, userId, clienteId);
  } catch (err) {
    console.error(
      JSON.stringify({
        scope: "instagram-reports-page",
        reason: "view_upsert_failed",
        clienteId,
        errorMessage: err instanceof Error ? err.message : String(err),
      }),
    );
  }
}
