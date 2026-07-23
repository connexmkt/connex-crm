import { createClient } from "@/lib/server";
import { ok, unauthorized, serverError } from "@/lib/api/response";
import { MOCK_LEADS } from "@/lib/mocks/leads";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  try {
    return ok(MOCK_LEADS);
  } catch (err) {
    console.error("[GET /api/leads]", err);
    return serverError();
  }
}
