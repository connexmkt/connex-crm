import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/server";
import { ok, badRequest, unauthorized, serverError } from "@/lib/api/response";

const loginSchema = z.object({
  email: z.string().email({ message: "E-mail inválido" }),
  password: z
    .string()
    .min(6, { message: "Senha deve ter no mínimo 6 caracteres" }),
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body)
    return badRequest({ message: "JSON inválido no corpo da requisição" });

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.flatten());

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    // Distingue credenciais inválidas de erros de infra
    if (
      error.message.toLowerCase().includes("invalid") ||
      error.message.toLowerCase().includes("credentials") ||
      error.message.toLowerCase().includes("email not confirmed")
    ) {
      return unauthorized();
    }
    console.error("[POST /api/auth/login]", error);
    return serverError();
  }

  return ok({
    user: {
      id: data.user.id,
      email: data.user.email,
    },
    session: {
      expires_at: data.session.expires_at,
    },
  });
}
