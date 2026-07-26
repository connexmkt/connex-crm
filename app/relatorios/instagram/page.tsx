import { Instagram } from "lucide-react";
import { requireAuthOrRedirect } from "@/lib/auth/require-auth";
import { AppShell } from "@/components/layout";
import { InstagramReportsService } from "@/lib/services/instagram-reports.service";
import { parsePaginationParam } from "@/lib/utils/pagination";
import { ClientReportCard } from "./components/ClientReportCard";
import { InstagramReportsPagination } from "./components/InstagramReportsPagination";

const DEFAULT_LIMIT = 12;

interface InstagramReportsPageProps {
  searchParams: Promise<{ page?: string; limit?: string }>;
}

/** Lista paginada de clientes com relatórios de Instagram disponíveis (US1/FR-003). */
export default async function InstagramReportsPage({ searchParams }: InstagramReportsPageProps) {
  const { userId } = await requireAuthOrRedirect();
  const query = await searchParams;
  const page = parsePaginationParam(query.page, 1);
  const limit = parsePaginationParam(query.limit, DEFAULT_LIMIT);

  const { items, total } = await InstagramReportsService.listClientsWithReports(page, limit, userId);

  return (
    <AppShell title="Relatórios de Instagram">
      <div className="space-y-6">
        {items.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((client) => (
              <ClientReportCard key={client.clienteId} client={client} />
            ))}
          </div>
        )}
        <InstagramReportsPagination
          page={page}
          limit={limit}
          total={total}
          basePath="/relatorios/instagram"
          itemLabel={total === 1 ? "cliente" : "clientes"}
        />
      </div>
    </AppShell>
  );
}

/** Estado vazio quando nenhum cliente possui relatório de Instagram ainda (FR-020). */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
      <Instagram className="h-10 w-10 text-muted-foreground/40" />
      <p className="max-w-md text-sm text-muted-foreground">
        Nenhum cliente possui relatórios de Instagram disponíveis ainda. Os relatórios
        aparecerão aqui automaticamente após o processamento pelo Connex Insights.
      </p>
    </div>
  );
}
