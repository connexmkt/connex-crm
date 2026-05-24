import type { ClienteSource, ServicoContratado } from "@/lib/types";

export const CLIENTE_SOURCES_OPTIONS: { value: ClienteSource; label: string; showReferrer?: boolean }[] = [
  { value: "prospeccao", label: "Prospecção" },
  { value: "indicacao", label: "Indicação", showReferrer: true },
  { value: "instagram", label: "Instagram" },
  { value: "site", label: "Site" },
  { value: "evento", label: "Evento" },
];

export const CLIENTE_SERVICOS_OPTIONS: { value: ServicoContratado; label: string }[] = [
  { value: "social_media", label: "Social Media" },
  { value: "trafego_pago", label: "Tráfego Pago" },
  { value: "branding", label: "Branding" },
  { value: "conteudo", label: "Conteúdo" },
  { value: "design", label: "Design" },
  { value: "seo", label: "SEO" },
];
