import { Badge } from "@/components/ui/badge";
import type { ReportStatus } from "@/lib/constants/instagram-reports";

interface ReportStatusBadgeProps {
  status: ReportStatus;
}

/** Badge de status de um relatório semanal/mensal — `PARTIAL` indica campos faltantes. */
export function ReportStatusBadge({ status }: ReportStatusBadgeProps) {
  switch (status) {
    case "AVAILABLE":
      return <Badge variant="secondary">Disponível</Badge>;
    case "PARTIAL":
      return (
        <Badge variant="outline" className="text-amber-600 dark:text-amber-400">
          Parcial
        </Badge>
      );
    default: {
      const _exhaustive: never = status;
      throw new Error(`Status de relatório não tratado: ${JSON.stringify(_exhaustive)}`);
    }
  }
}
