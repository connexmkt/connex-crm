import Link from "next/link";
import type { Aplicacao } from "@/lib/constants/aplicacoes";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface AplicacaoCardProps {
  aplicacao: Aplicacao;
}

export function AplicacaoCard({ aplicacao }: AplicacaoCardProps) {
  const { slug, nome, descricao, icone: Icon, disponivel } = aplicacao;

  const content = (
    <div
      className={cn(
        "group relative flex flex-col gap-3 rounded-xl border p-5 transition-all",
        disponivel
          ? "cursor-pointer border-border bg-card hover:border-primary/40 hover:shadow-md"
          : "cursor-not-allowed border-dashed border-border/60 bg-muted/30 opacity-70",
      )}
    >
      <div className="flex items-start justify-between">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg",
            disponivel ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        {!disponivel && (
          <Badge variant="outline" className="text-muted-foreground">
            Em breve
          </Badge>
        )}
      </div>
      <div>
        <h3 className="font-heading text-base font-semibold">{nome}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{descricao}</p>
      </div>
    </div>
  );

  if (!disponivel) {
    return (
      <div aria-disabled="true" data-testid={`aplicacao-card-${slug}`}>
        {content}
      </div>
    );
  }

  return (
    <Link href={`/aplicacoes/${slug}`} data-testid={`aplicacao-card-${slug}`}>
      {content}
    </Link>
  );
}
