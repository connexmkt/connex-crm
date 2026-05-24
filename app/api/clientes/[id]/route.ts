/**
 * GET /api/clientes/:id
 *
 * Response 200: { data: Client }
 * Response 401: Unauthorized
 * Response 404: Cliente não encontrado
 * Response 500: Internal Server Error
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * PUT /api/clientes/:id
 *
 * Body (JSON) — todos os campos são opcionais:
 *   name?           string  (2–100 chars)
 *   segment?        string
 *   status?         'Ativo' | 'Lead' | 'Inativo' | 'Em risco'
 *   contractValue?  number  (positive)
 *   logo?           string  (URL)
 *   contact?        { email, phone, website? }
 *
 * Response 200: { data: Client }
 * Response 400: Bad Request (erros de validação)
 * Response 401: Unauthorized
 * Response 404: Cliente não encontrado
 * Response 500: Internal Server Error
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * DELETE /api/clientes/:id
 *
 * Response 204: No Content
 * Response 401: Unauthorized
 * Response 404: Cliente não encontrado
 * Response 500: Internal Server Error
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/server";
import { ClientesService } from "@/lib/services/clientes.service";

import {
  ok,
  noContent,
  badRequest,
  unauthorized,
  notFound,
  serverError,
} from "@/lib/api/response";

const idSchema = z.string().uuid();

const updateClienteSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  logo: z.string().url().optional(),
  segment: z.string().min(1).optional(),
  status: z.enum(["Ativo", "Lead", "Inativo", "Em risco"]).optional(),
  source: z.enum(["indicacao", "instagram", "site", "prospeccao", "evento"]).optional(),
  sourceReferrer: z.string().nullable().optional(),
  servicos: z.array(z.enum(['social_media', 'trafego_pago', 'branding', 'conteudo', 'design', 'seo'])).optional(),
  contractValue: z.number().positive().optional(),
  contact: z
    .object({
      email: z.string().email(),
      phone: z.string().min(8),
      website: z.string().url().optional(),
    })
    .optional(),
  contractStartDate: z.string().date().nullable().optional(),
  contractRenewalDate: z.string().date().nullable().optional(),
  internalNotes: z.string().max(5000).nullable().optional(),
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
    const cliente = await ClientesService.getById(supabase, idParsed.data);
    return ok(cliente);
  } catch (err: unknown) {
    if (isNotFoundError(err)) return notFound("Cliente");
    console.error("[GET /api/clientes/:id]", err);
    return serverError();
  }
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
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

  const parsed = updateClienteSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.flatten());

  try {
    const cliente = await ClientesService.update(
      supabase,
      idParsed.data,
      parsed.data,
    );
    return ok(cliente);
  } catch (err: unknown) {
    if (isNotFoundError(err)) return notFound("Cliente");
    console.error("[PUT /api/clientes/:id]", err);
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
  const idParsed = idSchema.safeParse(id);
  if (!idParsed.success) return badRequest({ message: "ID inválido" });

  try {
    await ClientesService.delete(supabase, idParsed.data);
    return noContent();
  } catch (err: unknown) {
    if (isNotFoundError(err)) return notFound("Cliente");
    console.error("[DELETE /api/clientes/:id]", err);
    return serverError();
  }
}

// Supabase throws an object with `code` when a row is not found via `.single()`
function isNotFoundError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "PGRST116"
  );
}
