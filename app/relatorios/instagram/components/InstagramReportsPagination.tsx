import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InstagramReportsPaginationProps {
  page: number;
  limit: number;
  total: number;
  basePath: string;
  pageParam?: string;
  extraParams?: Record<string, string | number>;
  itemLabel?: string;
}

/**
 * Paginação sempre ativa (FR-026), reutilizada pela lista de clientes, pelos
 * meses (`MonthGrid`) e pelas semanas de um mês — nunca é omitida, mesmo com
 * apenas 1 página.
 */
export function InstagramReportsPagination({
  page,
  limit,
  total,
  basePath,
  pageParam = "page",
  extraParams = {},
  itemLabel = "itens",
}: InstagramReportsPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  function hrefFor(targetPage: number): string {
    const params = new URLSearchParams();
    Object.entries(extraParams).forEach(([key, value]) => params.set(key, String(value)));
    params.set(pageParam, String(targetPage));
    return `${basePath}?${params.toString()}`;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
      <p className="text-sm text-muted-foreground">
        Página {page} de {totalPages} — {total} {itemLabel}
      </p>
      <div className="flex items-center gap-2">
        {hasPrev ? (
          <Button asChild variant="outline" size="sm">
            <Link href={hrefFor(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>
        )}
        {hasNext ? (
          <Button asChild variant="outline" size="sm">
            <Link href={hrefFor(page + 1)}>
              Próxima
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Próxima
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
