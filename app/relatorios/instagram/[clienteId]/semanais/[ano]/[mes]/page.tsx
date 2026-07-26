import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft } from "lucide-react";
import { requireAuthOrRedirect } from "@/lib/auth/require-auth";
import { AppShell } from "@/components/layout";
import { InstagramReportsService } from "@/lib/services/instagram-reports.service";
import { InstagramReportsPagination } from "@/app/relatorios/instagram/components/InstagramReportsPagination";
import { ReportStatusBadge } from "@/app/relatorios/instagram/components/ReportStatusBadge";
import { parsePaginationParam } from "@/lib/utils/pagination";
import { parseYearMonthParams } from "@/lib/utils/report-date-params";

const WEEKS_LIMIT = 12;

interface SemanaisMesPageProps {
  params: Promise<{ clienteId: string; ano: string; mes: string }>;
  searchParams: Promise<{ page?: string }>;
}

/** Semanas de um mês específico, ordinalmente decrescentes (FR-011). */
export default async function SemanaisMesPage({ params, searchParams }: SemanaisMesPageProps) {
  await requireAuthOrRedirect();
  const { clienteId, ano, mes } = await params;
  const { page: pageParam } = await searchParams;

  const parsed = parseYearMonthParams(ano, mes);
  if (!parsed) notFound();
  const { year, month } = parsed;

  const page = parsePaginationParam(pageParam, 1);
  const { items, total } = await InstagramReportsService.listWeeksForMonth(
    clienteId,
    year,
    month,
    page,
    WEEKS_LIMIT,
  );

  const monthLabel = format(new Date(year, month - 1, 1), "MMMM yyyy", { locale: ptBR });
  const basePath = `/relatorios/instagram/${clienteId}/semanais/${year}/${month}`;

  return (
    <AppShell title={`Semanais — ${monthLabel}`}>
      <div className="space-y-6">
        <Link
          href={`/relatorios/instagram/${clienteId}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para o cliente
        </Link>

        <h2 className="text-lg font-semibold capitalize text-foreground">{monthLabel}</h2>

        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum relatório semanal disponível.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((week) => (
              <Link
                key={week.week}
                href={`${basePath}/${week.week}`}
                className="rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">{week.week}ª semana</span>
                  <ReportStatusBadge status={week.status} />
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {format(new Date(week.periodStart), "dd/MM", { locale: ptBR })} –{" "}
                  {format(new Date(week.periodEnd), "dd/MM", { locale: ptBR })}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Gerado em {format(new Date(week.generatedAt), "dd/MM/yyyy", { locale: ptBR })}
                </p>
              </Link>
            ))}
          </div>
        )}

        <InstagramReportsPagination
          page={page}
          limit={WEEKS_LIMIT}
          total={total}
          basePath={basePath}
          itemLabel={total === 1 ? "semana" : "semanas"}
        />
      </div>
    </AppShell>
  );
}
