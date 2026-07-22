import { z } from "zod";

/**
 * Schema único, compartilhado entre o formulário (react-hook-form) e o
 * Route Handler de criação de usuário (Principle III da Constituição).
 *
 * Ver specs/002-provisionamento-usuarios-insights/data-model.md
 * (Regras de validação da entidade `insights_user_provisioning_requests`).
 */
export const criarUsuarioSchema = z.object({
  name: z
    .string()
    .min(2, "O nome deve ter pelo menos 2 caracteres")
    .max(120, "O nome deve ter no máximo 120 caracteres"),
  email: z.string().email("E-mail inválido"),
  login: z
    .string()
    .min(3, "O login deve ter pelo menos 3 caracteres")
    .max(40, "O login deve ter no máximo 40 caracteres")
    .regex(
      /^[a-z0-9._-]+$/,
      "O login deve conter apenas letras minúsculas, números, ponto, hífen ou underscore",
    ),
  tenantId: z.string().uuid("Selecione um tenant"),
});

export type CriarUsuarioInput = z.infer<typeof criarUsuarioSchema>;
