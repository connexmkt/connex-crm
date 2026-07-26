import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { IntegrationStatusBadge } from "./IntegrationStatusBadge";
import type { ClientReportListItem } from "@/lib/services/instagram-reports.service";

interface ClientReportCardProps {
  client: ClientReportListItem;
}

function initialsOf(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

/** Card clicável de cliente com relatórios de Instagram disponíveis (FR-004/FR-005). */
export function ClientReportCard({ client }: ClientReportCardProps) {
  return (
    <Link
      href={`/relatorios/instagram/${client.clienteId}`}
      className="group flex flex-col gap-3 rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <Avatar className="h-11 w-11">
            <AvatarImage src={client.profilePictureUrl ?? undefined} alt={client.username ?? client.name} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {initialsOf(client.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">{client.name}</p>
            {client.username ? (
              <p className="truncate text-sm text-muted-foreground">@{client.username}</p>
            ) : (
              <p className="truncate text-sm text-muted-foreground">Sem usuário do Instagram</p>
            )}
          </div>
        </div>
        {client.isNew && (
          <Badge className="shrink-0 bg-primary text-primary-foreground" aria-label="Novos relatórios disponíveis">
            Novo
          </Badge>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
        <IntegrationStatusBadge status={client.integrationStatus} />
        <span className="text-xs text-muted-foreground">
          {client.lastReportReferenceDate
            ? `Último relatório: ${format(new Date(client.lastReportReferenceDate), "dd/MM/yyyy", { locale: ptBR })}`
            : "Sem relatórios ainda"}
        </span>
      </div>
    </Link>
  );
}
