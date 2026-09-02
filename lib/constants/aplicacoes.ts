import type { LucideIcon } from "lucide-react";
import { Workflow } from "lucide-react";

export interface Aplicacao {
  slug: string;
  nome: string;
  descricao: string;
  icone: LucideIcon;
  disponivel: boolean;
}

/**
 * Catálogo estático de aplicações/automações de propriedade da Connex,
 * exibido no hub `/aplicacoes`. Itens sem integração funcional são
 * apresentados como "Em breve" (FR-003).
 */
export const APLICACOES: Aplicacao[] = [
  {
    slug: "automacoes",
    nome: "Automações",
    descricao: "Fluxos automatizados de propriedade da Connex.",
    icone: Workflow,
    disponivel: false,
  },
];
