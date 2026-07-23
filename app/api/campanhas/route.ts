import { createClient } from "@/lib/server";
import { ok, unauthorized, serverError } from "@/lib/api/response";
import { MOCK_CAMPANHAS } from "@/lib/mocks/campanhas";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  try {
    return ok(MOCK_CAMPANHAS);
  } catch (err) {
    console.error("[GET /api/campanhas]", err);
    return serverError();
  }
}
