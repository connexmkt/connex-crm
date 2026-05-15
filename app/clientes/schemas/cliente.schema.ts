import { z } from "zod";

export const novoClienteSchema = z.object({
  name: z.string().min(2, "Nome deve ter ao menos 2 caracteres").max(100),
  segment: z.string().min(1, "Segmento é obrigatório"),
  status: z.enum(["Ativo", "Lead", "Inativo", "Em risco"], {
    required_error: "Selecione um status",
  }),
  plan: z.string().min(1, "Plano é obrigatório"),
  contractValue: z.coerce
    .number({ invalid_type_error: "Insira um valor válido" })
    .positive("Valor deve ser maior que zero"),
  contact: z.object({
    email: z.string().email("E-mail inválido"),
    phone: z.string().min(8, "Telefone deve ter ao menos 8 dígitos"),
    website: z.string().url("URL inválida").optional().or(z.literal("")),
  }),
  contractStartDate: z.string().optional().or(z.literal("")),
  contractRenewalDate: z.string().optional().or(z.literal("")),
  internalNotes: z.string().max(5000).optional(),
});

export type NovoClienteForm = z.infer<typeof novoClienteSchema>;