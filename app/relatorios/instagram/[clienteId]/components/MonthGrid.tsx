import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarX2 } from "lucide-react";
import { InstagramReportsPagination } from "@/app/relatorios/instagram/components/InstagramReportsPagination";

interface MonthGridItem {
  year: number;
  month: number;
}

interface MonthGridProps {
  months: MonthGridItem[];
  total: number;
  page: number;
  limit: number;
  /** Caminho base para o link de cada mês, ex.: `/relatorios/instagram/{clienteId}/semanais`. */
  monthBasePath: string;
  /** Caminho da própria página (usado para a paginação), ex.: `/relatorios/instagram/{clienteId}`. */
  paginationBasePath: string;
  pageParam: string;
  extraParams?: Record<string, string | number>;
  emptyMessage: string;
}

/**
 * Lista paginada de meses em ordem decrescente (FR-010/FR-015/FR-026),
 * reutilizada entre as tabs Semanais e Mensais da página do cliente.
 */
export function MonthGrid({
  months,
  total,
  page,
  limit,
  monthBasePath,
  paginationBasePath,
  pageParam,
  extraParams,
  emptyMessage,
}: MonthGridProps) {
  if (months.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-12 text-center">
        <CalendarX2 className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {months.map(({ year, month }) => (
          <Link
            key={`${year}-${month}`}
            href={`${monthBasePath}/${year}/${month}`}
            className="rounded-xl border border-border bg-card p-4 text-center capitalize transition-all hover:border-primary/30 hover:shadow-md"
          >
            <span className="font-medium text-foreground">
              {format(new Date(year, month - 1, 1), "MMMM yyyy", { locale: ptBR })}
            </span>
          </Link>
        ))}
      </div>
      <InstagramReportsPagination
        page={page}
        limit={limit}
        total={total}
        basePath={paginationBasePath}
        pageParam={pageParam}
        extraParams={extraParams}
        itemLabel={total === 1 ? "mês" : "meses"}
      />
    </div>
  );
}
