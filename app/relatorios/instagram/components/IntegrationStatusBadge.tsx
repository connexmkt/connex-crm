import { Badge } from "@/components/ui/badge";
import type { InstagramIntegrationStatus } from "@/lib/constants/instagram-reports";

interface IntegrationStatusBadgeProps {
  status: InstagramIntegrationStatus | null;
}

/**
 * Badge de status da integração de Instagram do cliente — `null` representa
 * uma falha isolada na leitura remota (FR-023), não um dos 3 status válidos.
 */
export function IntegrationStatusBadge({ status }: IntegrationStatusBadgeProps) {
  if (status === null) {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        Status indisponível
      </Badge>
    );
  }

  switch (status) {
    case "CONNECTED":
      return (
        <Badge className="border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
          Conectado
        </Badge>
      );
    case "DISCONNECTED":
      return <Badge variant="secondary">Desconectado</Badge>;
    case "REQUIRES_RECONNECTION":
      return <Badge variant="destructive">Requer reconexão</Badge>;
    default: {
      const _exhaustive: never = status;
      throw new Error(`Status de integração não tratado: ${JSON.stringify(_exhaustive)}`);
    }
  }
}
