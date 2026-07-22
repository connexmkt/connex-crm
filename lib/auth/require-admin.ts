import { redirect } from "next/navigation";
import { createClient } from "@/lib/server";

export type AdminCheckResult =
  | { ok: true; userId: string }
  | { ok: false; reason: "unauthenticated" | "forbidden" };

/**
 * Verifica se o usuário autenticado (sessão Supabase do próprio CRM) possui
 * papel `Admin`. Reutilizável em Route Handlers e Server Components
 * (FR-004, SEC-002).
 */
export async function checkAdmin(): Promise<AdminCheckResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, reason: "unauthenticated" };

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (error || !profile || profile.role !== "Admin") {
    return { ok: false, reason: "forbidden" };
  }

  return { ok: true, userId: user.id };
}

/**
 * Uso em Server Components (`app/aplicacoes/**\/page.tsx`): redireciona
 * usuários não autenticados para o login e usuários não-Admin para fora da
 * página (FR-004: "acesso é negado e sou redirecionado para fora da
 * página").
 */
export async function requireAdminOrRedirect(): Promise<{ userId: string }> {
  const result = await checkAdmin();

  if (!result.ok) {
    redirect(result.reason === "unauthenticated" ? "/auth/login" : "/");
  }

  return { userId: result.userId };
}
