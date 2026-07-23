import { createClient } from "@/lib/server";
import { ok, unauthorized, notFound, serverError } from "@/lib/api/response";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  try {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, name, email, avatar, role")
      .eq("id", user.id)
      .single();

    if (error || !profile) return notFound("Perfil");

    return ok({
      id: profile.id,
      email: profile.email,
      name: profile.name,
      role: profile.role,
      avatar: profile.avatar ?? "",
    });
  } catch (err) {
    console.error("[GET /api/auth/me]", err);
    return serverError();
  }
}
