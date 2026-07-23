import { redirect } from "next/navigation";
import { createClient } from "@/lib/server";

export type AuthCheckResult =
  | { ok: true; userId: string }
  | { ok: false; reason: "unauthenticated" };

export async function checkAuth(): Promise<AuthCheckResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, reason: "unauthenticated" };

  return { ok: true, userId: user.id };
}

export async function requireAuthOrRedirect(): Promise<{ userId: string }> {
  const result = await checkAuth();

  if (!result.ok) {
    redirect("/auth/login");
  }

  return { userId: result.userId };
}
