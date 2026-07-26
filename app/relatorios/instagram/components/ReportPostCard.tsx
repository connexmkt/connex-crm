import Image from "next/image";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ExternalLink, ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PostRole } from "@/lib/constants/instagram-reports";
import type { ReportPostOutput } from "@/lib/types/instagram-reports";

interface ReportPostCardProps {
  post: ReportPostOutput;
  /** Destaque adicional para a `TOP_1` do relatório mensal (FR-016). */
  highlight?: boolean;
}

function roleLabel(role: PostRole): string {
  switch (role) {
    case "BEST":
      return "Melhor performance";
    case "WORST":
      return "Pior performance";
    case "TOP_1":
      return "1º lugar";
    case "TOP_2":
      return "2º lugar";
    case "TOP_3":
      return "3º lugar";
    default: {
      const _exhaustive: never = role;
      throw new Error(`Papel de postagem não tratado: ${JSON.stringify(_exhaustive)}`);
    }
  }
}

/**
 * Card de postagem reutilizado entre melhor/pior (semanal) e top 3/pior
 * (mensal) — diferenciação visual clara por papel (FR-013): tom esmeralda
 * para papéis positivos, vermelho para `WORST` (FR-017). Nunca reinterpreta
 * os valores recebidos do Connex Insights (FR-027).
 */
export function ReportPostCard({ post, highlight = false }: ReportPostCardProps) {
  const negative = post.role === "WORST";
  const metricsEntries = Object.entries(post.metrics);

  return (
    <div
      className={cn(
        "rounded-xl border p-4 transition-all",
        negative ? "border-destructive/40 bg-destructive/5" : "border-emerald-500/40 bg-emerald-500/5",
        highlight && "ring-2 ring-primary/50",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span
          className={cn(
            "text-sm font-semibold",
            negative ? "text-destructive" : "text-emerald-700 dark:text-emerald-400",
          )}
        >
          {roleLabel(post.role)}
        </span>
        {highlight && (
          <span className="text-sm font-medium text-primary">🏆 Melhor Performance do Mês</span>
        )}
      </div>

      <div className="mt-3 flex gap-3">
        {post.thumbnailUrl ? (
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
            <Image src={post.thumbnailUrl} alt="" fill sizes="80px" className="object-cover" />
          </div>
        ) : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-muted">
            <ImageOff className="h-6 w-6 text-muted-foreground/50" />
          </div>
        )}

        <div className="min-w-0 flex-1 space-y-1">
          {post.contentType && (
            <p className="text-xs font-medium uppercase text-muted-foreground">{post.contentType}</p>
          )}
          {post.publishedAt && (
            <p className="text-xs text-muted-foreground">
              Publicado em {format(new Date(post.publishedAt), "dd/MM/yyyy", { locale: ptBR })}
            </p>
          )}
          {post.primaryMetricName && post.primaryMetricValue !== null && (
            <p className="text-sm font-medium text-foreground">
              {post.primaryMetricName}: {post.primaryMetricValue.toLocaleString("pt-BR")}
            </p>
          )}
          {post.permalink && (
            <a
              href={post.permalink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Ver no Instagram <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>

      {metricsEntries.length > 0 && (
        <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3 text-xs sm:grid-cols-3">
          {metricsEntries.map(([key, value]) => (
            <div key={key}>
              <dt className="text-muted-foreground">{key}</dt>
              <dd className="font-medium text-foreground">{String(value)}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
