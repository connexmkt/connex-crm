import type { PipelineStage } from "@/lib/types";

export const PIPELINE_STAGE_CONFIG: Record<
  PipelineStage,
  { label: string; icon: string; color: string; headerBg: string }
> = {
  novo_lead: {
    label: "Novo Lead",
    icon: "🎯",
    color: "#5B5FE8",
    headerBg: "bg-primary/10",
  },
  em_contato: {
    label: "Em Contato",
    icon: "💬",
    color: "#14B8A6",
    headerBg: "bg-chart-2/10",
  },
  reuniao_agendada: {
    label: "Reunião Agendada",
    icon: "📅",
    color: "#8B5CF6",
    headerBg: "bg-chart-3/10",
  },
  proposta_enviada: {
    label: "Proposta Enviada",
    icon: "📄",
    color: "#F59E0B",
    headerBg: "bg-warning/10",
  },
  negociacao: {
    label: "Negociação",
    icon: "🤝",
    color: "#EC4899",
    headerBg: "bg-pink-500/10",
  },
  fechado: {
    label: "Fechado",
    icon: "🏆",
    color: "#22C55E",
    headerBg: "bg-success/10",
  },
  perdido: {
    label: "Perdido",
    icon: "❌",
    color: "#EF4444",
    headerBg: "bg-danger/10",
  },
};

export const PIPELINE_STAGES: PipelineStage[] = [
  "novo_lead",
  "em_contato",
  "reuniao_agendada",
  "proposta_enviada",
  "negociacao",
  "fechado",
  "perdido",
];

export const LOST_REASON_OPTIONS = [
  "Preço",
  "Concorrente",
  "Timing",
  "Sem budget",
  "Sem fit",
  "Outro",
] as const;

export type LostReason = (typeof LOST_REASON_OPTIONS)[number];
