import type { LucideIcon } from "lucide-react";
import { BarChart3, Bot, Workflow } from "lucide-react";

export interface Aplicacao {
  slug: string;
  nome: string;
  descricao: string;
  icone: LucideIcon;
  disponivel: boolean;
}

/**
 * Catálogo estático de aplicações/automações de propriedade da Connex,
 * exibido no hub `/aplicacoes`. Apenas "connex-insights" tem integração
 * funcional nesta feature; os demais itens são apresentados como
 * "Em breve" (FR-003).
 */
export const APLICACOES: Aplicacao[] = [
  {
    slug: "connex-insights",
    nome: "Connex Insights",
    descricao: "Provisionamento de usuários e visão geral de tenants.",
    icone: BarChart3,
    disponivel: true,
  },
  {
    slug: "automacoes",
    nome: "Automações",
    descricao: "Fluxos automatizados de propriedade da Connex.",
    icone: Workflow,
    disponivel: false,
  },
];
