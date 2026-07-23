import { createClient } from "@/lib/server";
import { ok, unauthorized, serverError } from "@/lib/api/response";

export async function POST() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("[POST /api/auth/logout]", error);
    return serverError();
  }

  return ok({ message: "Logout realizado com sucesso" });
}
