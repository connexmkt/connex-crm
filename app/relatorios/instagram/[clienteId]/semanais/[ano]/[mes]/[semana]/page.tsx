import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft } from "lucide-react";
import { requireAuthOrRedirect } from "@/lib/auth/require-auth";
import { AppShell } from "@/components/layout";
import { InstagramReportsService } from "@/lib/services/instagram-reports.service";
import { ReportStatusBadge } from "@/app/relatorios/instagram/components/ReportStatusBadge";
import { ReportPostCard } from "@/app/relatorios/instagram/components/ReportPostCard";
import { parseYearMonthParams, parseWeekParam } from "@/lib/utils/report-date-params";

interface SemanaPageProps {
  params: Promise<{ clienteId: string; ano: string; mes: string; semana: string }>;
}

/** Conteúdo do relatório semanal: melhor e pior postagem (FR-012/FR-013). */
export default async function SemanaPage({ params }: SemanaPageProps) {
  await requireAuthOrRedirect();
  const { clienteId, ano, mes, semana } = await params;

  const parsedMonth = parseYearMonthParams(ano, mes);
  const week = parseWeekParam(semana);
  if (!parsedMonth || !week) notFound();
  const { year, month } = parsedMonth;

  const report = await InstagramReportsService.getWeeklyReport(clienteId, year, month, week);
  if (!report) notFound();

  const monthLabel = format(new Date(year, month - 1, 1), "MMMM yyyy", { locale: ptBR });

  return (
    <AppShell title={`${week}ª semana — ${monthLabel}`}>
      <div className="space-y-6">
        <Link
          href={`/relatorios/instagram/${clienteId}/semanais/${year}/${month}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para as semanas de {monthLabel}
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{week}ª semana — {monthLabel}</h2>
            <p className="text-sm text-muted-foreground">
              {format(new Date(report.periodStart), "dd/MM/yyyy", { locale: ptBR })} –{" "}
              {format(new Date(report.periodEnd), "dd/MM/yyyy", { locale: ptBR })}
            </p>
          </div>
          <ReportStatusBadge status={report.status} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {report.bestPost ? (
            <ReportPostCard post={report.bestPost} />
          ) : (
            <EmptyPostSlot label="melhor performance" />
          )}
          {report.worstPost ? (
            <ReportPostCard post={report.worstPost} />
          ) : (
            <EmptyPostSlot label="pior performance" />
          )}
        </div>
      </div>
    </AppShell>
  );
}

function EmptyPostSlot({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
      Postagem de {label} não disponível para esta semana.
    </div>
  );
}
