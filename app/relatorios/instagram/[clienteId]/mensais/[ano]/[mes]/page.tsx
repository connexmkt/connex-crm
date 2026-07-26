import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, TrendingUp, Users } from "lucide-react";
import { requireAuthOrRedirect } from "@/lib/auth/require-auth";
import { AppShell } from "@/components/layout";
import { InstagramReportsService } from "@/lib/services/instagram-reports.service";
import { ReportStatusBadge } from "@/app/relatorios/instagram/components/ReportStatusBadge";
import { ReportPostCard } from "@/app/relatorios/instagram/components/ReportPostCard";
import { parseYearMonthParams } from "@/lib/utils/report-date-params";

interface MensaisMesPageProps {
  params: Promise<{ clienteId: string; ano: string; mes: string }>;
}

/** Conteúdo do relatório mensal: top 3, pior postagem, seguidores e alcance (FR-016). */
export default async function MensaisMesPage({ params }: MensaisMesPageProps) {
  await requireAuthOrRedirect();
  const { clienteId, ano, mes } = await params;

  const parsed = parseYearMonthParams(ano, mes);
  if (!parsed) notFound();
  const { year, month } = parsed;

  const report = await InstagramReportsService.getMonthlyReport(clienteId, year, month);
  if (!report) notFound();

  const monthLabel = format(new Date(year, month - 1, 1), "MMMM yyyy", { locale: ptBR });

  return (
    <AppShell title={`Mensal — ${monthLabel}`}>
      <div className="space-y-6">
        <Link
          href={`/relatorios/instagram/${clienteId}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para o cliente
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold capitalize text-foreground">{monthLabel}</h2>
          <ReportStatusBadge status={report.status} />
        </div>

        <FollowersSummary report={report} />

        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Top 3 postagens</h3>
          {report.topPosts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma postagem em destaque disponível.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-3">
              {report.topPosts.map((post) => (
                <ReportPostCard key={post.instagramMediaId} post={post} highlight={post.role === "TOP_1"} />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Pior performance</h3>
          {report.worstPost ? (
            <div className="sm:max-w-md">
              <ReportPostCard post={report.worstPost} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Postagem de pior performance não disponível.</p>
          )}
        </section>
      </div>
    </AppShell>
  );
}

interface FollowersSummaryProps {
  report: {
    followersGained: number | null;
    followersStart: number | null;
    followersEnd: number | null;
    followersGrowthPct: number | null;
    accountsReached: number | null;
  };
}

function FollowersSummary({ report }: FollowersSummaryProps) {
  const hasFollowersData =
    report.followersGained !== null ||
    report.followersStart !== null ||
    report.followersEnd !== null ||
    report.followersGrowthPct !== null;

  if (!hasFollowersData && report.accountsReached === null) return null;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {hasFollowersData && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <TrendingUp className="h-4 w-4 text-primary" />
            Seguidores ganhos
          </div>
          <p className="mt-1 text-2xl font-semibold text-foreground">
            {report.followersGained !== null ? `+${report.followersGained.toLocaleString("pt-BR")}` : "—"}
          </p>
          {(report.followersStart !== null || report.followersEnd !== null) && (
            <p className="mt-1 text-xs text-muted-foreground">
              {report.followersStart?.toLocaleString("pt-BR") ?? "—"} → {report.followersEnd?.toLocaleString("pt-BR") ?? "—"}
              {report.followersGrowthPct !== null && ` (${report.followersGrowthPct}%)`}
            </p>
          )}
        </div>
      )}
      {report.accountsReached !== null && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Users className="h-4 w-4 text-primary" />
            Contas alcançadas
          </div>
          <p className="mt-1 text-2xl font-semibold text-foreground">
            {report.accountsReached.toLocaleString("pt-BR")}
          </p>
        </div>
      )}
    </div>
  );
}
