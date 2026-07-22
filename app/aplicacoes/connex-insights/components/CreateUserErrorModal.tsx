import { AlertTriangle } from "lucide-react";

/**
 * Mapa de mensagens amigáveis por status HTTP — ver
 * specs/002-provisionamento-usuarios-insights/data-model.md § "Mensagens
 * de Erro (UI)". Nunca exibir o corpo bruto da resposta de erro (nome de
 * tabela, stack trace, Prisma/Supabase) — mapear estritamente por status.
 */
const ERROR_MESSAGES: Record<number, string> = {
  400: "Verifique os campos destacados e tente novamente.",
  401: "Sua sessão expirou. Faça login novamente.",
  403: "Você não tem permissão para criar usuários do Connex Insights.",
  404: "O tenant selecionado não foi encontrado. Atualize a lista e tente novamente.",
  409: "Já existe um usuário com este e-mail ou login. Verifique os dados e tente novamente.",
  502: "Não foi possível concluir a criação no momento. Tente novamente em instantes.",
};

const DEFAULT_MESSAGE = "Não foi possível concluir a criação no momento. Tente novamente em instantes.";

export function getCreateUserErrorMessage(status: number): string {
  return ERROR_MESSAGES[status] ?? DEFAULT_MESSAGE;
}

interface CreateUserErrorModalProps {
  status: number;
}

/**
 * Renderizada inline dentro de `CreateUserDialog` (o diálogo permanece
 * aberto, preservando os dados do formulário — FR-017) em vez de um
 * segundo `Dialog` empilhado sobre o de criação.
 */
export function CreateUserErrorModal({ status }: CreateUserErrorModalProps) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{getCreateUserErrorMessage(status)}</span>
    </div>
  );
}
