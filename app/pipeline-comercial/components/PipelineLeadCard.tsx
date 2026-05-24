import { PipelineLead } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DollarSign, Calendar, Clock, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TEMPERATURE_CONFIG } from "@/lib/constants/pipeline";

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1000) return `R$ ${(value / 1000).toFixed(1)}k`;
  return `R$ ${value.toLocaleString("pt-BR")}`;
}

function formatDate(date: Date | string | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

function formatRelativeDate(date: Date | string | undefined): string {
  if (!date) return "—";
  const d = new Date(date);
  const diff = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (diff === 0) return "hoje";
  if (diff === 1) return "ontem";
  if (diff < 7) return `há ${diff} dias`;
  return formatDate(d);
}

export function PipelineLeadCard({
  lead,
  isDragging = false,
  onClick,
}: {
  lead: PipelineLead;
  isDragging?: boolean;
  onClick?: () => void;
}) {
  const isStale = lead.isStale;
  const tempConfig =
    TEMPERATURE_CONFIG[lead.temperature] ?? TEMPERATURE_CONFIG.morno;

  return (
    <div
      onClick={onClick}
      className={cn(
        "cursor-pointer rounded-xl border bg-card p-4 transition-all select-none",
        isDragging
          ? "shadow-xl scale-[1.02] border-primary/40"
          : "border-border hover:border-primary/20 hover:shadow-md",
        isStale && !isDragging && "border-danger/30 bg-danger/5",
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {lead.companyName}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {lead.contactName}
          </p>
        </div>
        <div className="flex flex-wrap gap-1 justify-end shrink-0">
          <Badge
            variant="outline"
            className={cn(
              "text-[9px] px-1.5 py-0 border-transparent",
              tempConfig.bg,
              tempConfig.color,
            )}
          >
            {tempConfig.icon} {tempConfig.label}
          </Badge>
          <Badge
            variant="outline"
            className="text-[9px] px-1.5 py-0 border-border"
          >
            {lead.source === "prospeccao"
              ? "Prosp."
              : lead.source === "indicacao"
                ? "Indic."
                : lead.source === "instagram"
                  ? "Insta"
                  : lead.source === "evento"
                    ? "Evento"
                    : "Site"}
          </Badge>
        </div>
      </div>

      {/* Estimated value */}
      <div className="mt-2.5 flex items-center gap-1 text-sm font-bold text-foreground">
        <DollarSign className="h-3.5 w-3.5 text-success" />
        {formatCurrency(lead.estimatedValue)}
      </div>

      {/* Meeting date — only for reuniao_agendada */}
      {lead.stage === "reuniao_agendada" && lead.meetingDate && (
        <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-purple-500">
          <Calendar className="h-3 w-3" />
          Reunião: {formatDate(lead.meetingDate)}
        </div>
      )}

      {/* Lost reason — only for perdido */}
      {lead.stage === "perdido" && lead.lostReason && (
        <div className="mt-2 rounded bg-danger/10 px-2 py-1 text-xs text-danger line-clamp-2">
          {lead.lostReason}
        </div>
      )}

      {/* Last contact */}
      <p className="mt-2.5 text-xs text-muted-foreground">
        Último contato: {formatRelativeDate(lead.lastContactAt)}
      </p>

      {/* Next action */}
      {lead.nextAction && (
        <div className="mt-1.5 rounded-md bg-secondary/60 px-2 py-1.5 text-xs">
          <span className="text-muted-foreground">→ </span>
          <span className="font-medium text-foreground">{lead.nextAction}</span>
          {lead.nextActionDate && (
            <span className="text-muted-foreground">
              {" "}
              até {formatDate(lead.nextActionDate)}
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between">
        <div
          className={cn(
            "flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
            isStale
              ? "bg-danger/15 text-danger"
              : "bg-secondary text-muted-foreground",
          )}
        >
          <Clock className="h-2.5 w-2.5" />
          {lead.daysInStage}d nesta etapa
          {isStale && <AlertTriangle className="h-2.5 w-2.5 ml-0.5" />}
        </div>
        <Avatar className="h-6 w-6">
          <AvatarImage src={lead.responsible?.avatar} />
          <AvatarFallback className="bg-primary/10 text-[9px] text-primary">
            {lead.responsible?.name
              ?.split(" ")
              .map((n) => n[0])
              .join("") ?? "?"}
          </AvatarFallback>
        </Avatar>
      </div>
    </div>
  );
}
