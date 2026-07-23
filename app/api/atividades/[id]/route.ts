import { createClient } from "@/lib/server";
import {
  noContent,
  unauthorized,
  notFound,
  serverError,
} from "@/lib/api/response";
import { AtividadesService } from "@/lib/services/atividades.service";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const { id } = await params;

  try {
    await AtividadesService.delete(supabase, id);
    return noContent();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("not found") || msg.includes("PGRST116"))
      return notFound("Atividade");
    console.error("[DELETE /api/atividades/:id]", err);
    return serverError();
  }
}
