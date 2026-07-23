import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/server";
import { LeadInteractionsService } from "@/lib/services/lead-interactions.service";
import {
  ok,
  created,
  badRequest,
  unauthorized,
  serverError,
} from "@/lib/api/response";

const idSchema = z.string().uuid();

const createInteractionSchema = z.object({
  kind: z.enum(["whatsapp", "email", "ligacao", "reuniao", "outro"]),
  description: z.string().min(1),
  occurredAt: z.string().datetime().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const { id } = await params;
  const idParsed = idSchema.safeParse(id);
  if (!idParsed.success) return badRequest({ message: "ID inválido" });

  try {
    const interactions = await LeadInteractionsService.listByLead(
      supabase,
      idParsed.data,
    );
    return ok(interactions);
  } catch (err) {
    console.error("[GET /api/pipeline/:id/interactions]", err);
    return serverError();
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const { id } = await params;
  const idParsed = idSchema.safeParse(id);
  if (!idParsed.success) return badRequest({ message: "ID inválido" });

  const body = await request.json().catch(() => null);
  if (!body)
    return badRequest({ message: "JSON inválido no corpo da requisição" });

  const parsed = createInteractionSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.flatten());

  try {
    const interaction = await LeadInteractionsService.create(supabase, {
      ...parsed.data,
      leadId: idParsed.data,
    });
    return created(interaction);
  } catch (err) {
    console.error("[POST /api/pipeline/:id/interactions]", err);
    return serverError();
  }
}
