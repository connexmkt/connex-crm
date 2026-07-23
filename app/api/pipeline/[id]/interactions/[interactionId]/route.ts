import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/server";
import { LeadInteractionsService } from "@/lib/services/lead-interactions.service";
import {
  noContent,
  badRequest,
  unauthorized,
  serverError,
} from "@/lib/api/response";

const idSchema = z.string().uuid();

type RouteContext = { params: Promise<{ id: string; interactionId: string }> };

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const { interactionId } = await params;
  const idParsed = idSchema.safeParse(interactionId);
  if (!idParsed.success)
    return badRequest({ message: "ID de interação inválido" });

  try {
    await LeadInteractionsService.delete(supabase, idParsed.data);
    return noContent();
  } catch (err) {
    console.error(
      "[DELETE /api/pipeline/:id/interactions/:interactionId]",
      err,
    );
    return serverError();
  }
}
