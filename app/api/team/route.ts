import { createClient } from "@/lib/server";
import { ok, unauthorized, serverError } from "@/lib/api/response";
import type { User } from "@/lib/types";

interface ProfileRow {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  role: User["role"];
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  try {
    const { data: rows, error } = await supabase
      .from("profiles")
      .select("id, name, email, avatar, role")
      .order("name", { ascending: true });

    if (error) throw error;

    const members: User[] = ((rows ?? []) as ProfileRow[]).map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      avatar: row.avatar ?? "",
      role: row.role,
    }));

    return ok(members);
  } catch (err) {
    console.error("[GET /api/team]", err);
    return serverError();
  }
}
