import type { PipelineStage, LeadSource, LeadTemperature, LeadInteractionKind } from "@/lib/types";

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

export const LEAD_SOURCES_OPTIONS: { value: LeadSource; label: string; showReferrer?: boolean }[] = [
  { value: "prospeccao", label: "Prospecção" },
  { value: "indicacao", label: "Indicação", showReferrer: true },
  { value: "instagram", label: "Instagram" },
  { value: "site", label: "Site" },
  { value: "evento", label: "Evento" },
];

export const TEMPERATURE_CONFIG: Record<
  LeadTemperature,
  { label: string; icon: string; color: string; bg: string }
> = {
  quente: { label: "Quente", icon: "🔥", color: "#EF4444", bg: "bg-red-500/10" },
  morno: { label: "Morno", icon: "🌡️", color: "#F59E0B", bg: "bg-orange-500/10" },
  frio: { label: "Frio", icon: "❄️", color: "#3B82F6", bg: "bg-blue-500/10" },
};

export const INTERACTION_KIND_CONFIG: Record<
  LeadInteractionKind,
  { label: string; icon: string }
> = {
  whatsapp: { label: "WhatsApp", icon: "💬" },
  email: { label: "E-mail", icon: "📧" },
  ligacao: { label: "Ligação", icon: "📞" },
  reuniao: { label: "Reunião", icon: "👥" },
  outro: { label: "Outro", icon: "📝" },
};
