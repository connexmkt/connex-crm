import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { IntegrationStatusBadge } from "@/app/relatorios/instagram/components/IntegrationStatusBadge";
import type { ClienteInstagramHeaderData } from "@/lib/services/instagram-reports.service";

interface ClienteInstagramHeaderProps {
  header: ClienteInstagramHeaderData;
}

function initialsOf(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

/** Cabeçalho da página do cliente: nome, conta, avatar, última atualização (FR-006). */
export function ClienteInstagramHeader({ header }: ClienteInstagramHeaderProps) {
  return (
    <div className="space-y-4">
      <Link
        href="/relatorios/instagram"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para a lista de clientes
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14">
            <AvatarImage src={header.profilePictureUrl ?? undefined} alt={header.username ?? header.name} />
            <AvatarFallback className="bg-primary/10 text-lg text-primary">
              {initialsOf(header.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-lg font-semibold text-foreground">{header.name}</h1>
            <p className="text-sm text-muted-foreground">
              {header.username ? `@${header.username}` : "Sem usuário do Instagram"}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <IntegrationStatusBadge status={header.integrationStatus} />
          <span className="text-xs text-muted-foreground">
            {header.lastUpdatedAt
              ? `Atualizado em ${format(new Date(header.lastUpdatedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`
              : "Ainda sem relatórios processados"}
          </span>
        </div>
      </div>
    </div>
  );
}
