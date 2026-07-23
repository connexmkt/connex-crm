import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/server";
import {
  ok,
  noContent,
  badRequest,
  unauthorized,
  notFound,
  serverError,
} from "@/lib/api/response";
import { ConteudoService } from "@/lib/services/conteudo.service";

const updateSchema = z.object({
  clientId: z.string().optional(),
  platform: z.enum(["Instagram", "LinkedIn", "YouTube", "Blog"]).optional(),
  type: z.enum(["Feed", "Stories", "Reels", "Artigo"]).optional(),
  title: z.string().min(2).max(200).optional(),
  caption: z.string().max(2000).optional(),
  publishDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  publishTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
  status: z
    .enum(["Rascunho", "Aguardando aprovação", "Aprovado", "Publicado"])
    .optional(),
  responsibleId: z.string().uuid().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) return badRequest("JSON inválido");

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.flatten());

  try {
    const item = await ConteudoService.update(supabase, id, parsed.data);
    return ok(item);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("PGRST116") || msg.includes("not found"))
      return notFound("Conteúdo");
    console.error("[PUT /api/conteudo/:id]", err);
    return serverError();
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const { id } = await params;

  try {
    await ConteudoService.delete(supabase, id);
    return noContent();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("PGRST116") || msg.includes("not found"))
      return notFound("Conteúdo");
    console.error("[DELETE /api/conteudo/:id]", err);
    return serverError();
  }
}
