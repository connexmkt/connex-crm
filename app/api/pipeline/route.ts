import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/server";
import { PipelineService } from "@/lib/services/pipeline.service";
import { NotificationsService } from "@/lib/services/notifications.service";
import {
  ok,
  created,
  badRequest,
  unauthorized,
  serverError,
} from "@/lib/api/response";

const PIPELINE_STAGES = [
  "novo_lead",
  "em_contato",
  "reuniao_agendada",
  "proposta_enviada",
  "negociacao",
  "fechado",
  "perdido",
] as const;

const LEAD_SOURCES = [
  "site",
  "indicacao",
  "instagram",
  "prospeccao",
  "evento",
] as const;

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  stage: z.enum(PIPELINE_STAGES).optional(),
  responsibleId: z.string().uuid().optional(),
  search: z.string().max(100).optional(),
});

const createLeadSchema = z.object({
  companyName: z.string().min(2).max(200),
  contactName: z.string().min(2).max(200),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().min(8).max(50).optional(),
  estimatedValue: z.number().min(0),
  stage: z.enum(PIPELINE_STAGES).default("novo_lead"),
  responsibleId: z.string().uuid().optional(),
  source: z.enum(LEAD_SOURCES).default("prospeccao"),
  sourceReferrer: z.string().optional(),
  temperature: z.enum(["quente", "morno", "frio"]).default("morno"),
  lastContactAt: z.string().datetime().optional(),
  nextAction: z.string().max(500).optional(),
  nextActionDate: z.string().date().optional(),
  meetingDate: z.string().date().optional(),
  notes: z.string().max(5000).optional(),
  staleAfterDays: z.number().int().positive().default(7),
});

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const { searchParams } = request.nextUrl;
  const parsed = listQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) return badRequest(parsed.error.flatten());

  try {
    const result = await PipelineService.list(supabase, parsed.data);
    return ok(result);
  } catch (err) {
    console.error("[GET /api/pipeline]", err);
    return serverError();
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const body = await request.json().catch(() => null);
  if (!body)
    return badRequest({ message: "JSON inválido no corpo da requisição" });

  const parsed = createLeadSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.flatten());

  try {
    const lead = await PipelineService.create(supabase, {
      ...parsed.data,
      responsibleId: parsed.data.responsibleId ?? user.id,
    });

    NotificationsService.broadcast(supabase, {
      title: "Novo lead cadastrado",
      message: `${lead.companyName} foi adicionado ao pipeline por ${lead.responsible.name}`,
      type: "info",
    }).catch((err) =>
      console.error("[notifications] broadcast erro (novo lead):", err),
    );

    return created(lead);
  } catch (err) {
    console.error("[POST /api/pipeline]", err);
    return serverError();
  }
}
