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

const FALLBACK_TEAM: User[] = [
  {
    id: "u1",
    name: "Lucas Oliveira",
    email: "lucas@connex.com.br",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Lucas",
    role: "Admin",
  },
  {
    id: "u2",
    name: "Marina Santos",
    email: "marina@connex.com.br",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Marina",
    role: "Gestor",
  },
  {
    id: "u3",
    name: "Rafael Costa",
    email: "rafael@connex.com.br",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Rafael",
    role: "Analista",
  },
  {
    id: "u4",
    name: "Juliana Ferreira",
    email: "juliana@connex.com.br",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Juliana",
    role: "Gestor",
  },
  {
    id: "u5",
    name: "Pedro Almeida",
    email: "pedro@connex.com.br",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Pedro",
    role: "Analista",
  },
];

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

    return ok(members.length > 0 ? members : FALLBACK_TEAM);
  } catch (err) {
    console.error("[GET /api/team]", err);
    return serverError();
  }
}
