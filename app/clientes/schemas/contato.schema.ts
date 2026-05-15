import { z } from "zod";

export const contatoSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(100),
  role: z.string().min(1, "Cargo é obrigatório").max(100),
  type: z.enum(["decisor", "financeiro", "operacional", "outro"], {
    required_error: "Selecione o tipo",
  }),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  whatsapp: z
    .string()
    .min(8, "WhatsApp deve ter ao menos 8 dígitos")
    .optional()
    .or(z.literal("")),
  preferredChannel: z.enum(["email", "whatsapp", "phone", "outro"]).optional(),
});

export type ContatoForm = z.infer<typeof contatoSchema>;