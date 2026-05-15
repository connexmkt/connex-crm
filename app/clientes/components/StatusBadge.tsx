import { Badge } from "@/components/ui/badge";
import { statusConfig } from "../constants/status-config";
import { Client } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function StatusBadge({ status }: { status: Client["status"] }) {
  const config = statusConfig[status];
  return (
    <Badge variant="outline" className={cn("text-xs", config.className)}>
      {config.label}
    </Badge>
  );
}
