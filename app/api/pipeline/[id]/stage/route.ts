/**
 * PATCH /api/pipeline/:id/stage
 *
 * Move um lead para um novo estágio no kanban.
 * Reseta o contador de dias no estágio (stageEnteredAt = now()).
 *
 * Body (JSON):
 *   stage        PipelineStage  (obrigatório)
 *   lostReason?  string         (obrigatório quando stage = 'perdido')
 *   meetingDate? string         (date YYYY-MM-DD, recomendado quando stage = 'reuniao_agendada')
 *   clienteId?   string         (UUID, opcional quando stage = 'fechado' — vincula a um cliente existente)
 *
 * Regras de negócio:
 *   - 'perdido'          → lostReason é obrigatório
 *   - 'reuniao_agendada' → meetingDate é persitido no card se informado
 *   - 'fechado'          → clienteId opcional para vincular o lead convertido
 *
 * Response 200: { data: PipelineLead }
 * Response 400: Bad Request (validação ou regra de negócio)
 * Response 401: Unauthorized
 * Response 404: Lead não encontrado
 * Response 500: Internal Server Error
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/server";
import { PipelineService } from "@/lib/services/pipeline.service";
import { LOST_REASON_OPTIONS } from "@/lib/constants/pipeline";

import {
  ok,
  badRequest,
  unauthorized,
  notFound,
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

const idSchema = z.string().uuid();

const moveStageSchema = z.object({
  stage: z.enum(PIPELINE_STAGES),
  lostReason: z.string().min(1).max(500).optional(),
  meetingDate: z.string().date().optional(),
  clienteId: z.string().uuid().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteContext) {
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

  const parsed = moveStageSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.flatten());

  if (parsed.data.stage === "perdido") {
    if (!parsed.data.lostReason) {
      return badRequest({
        message: 'O campo "lostReason" é obrigatório para o estágio "perdido"',
      });
    }

    if (parsed.data.lostReason.startsWith("Outro:")) {
      const detail = parsed.data.lostReason.replace("Outro:", "").trim();
      if (detail.length < 3) {
        return badRequest({
          message:
            'Para o motivo "Outro", forneça um detalhamento de pelo menos 3 caracteres',
        });
      }
    }
  }

  try {
    const lead = await PipelineService.moveStage(
      supabase,
      idParsed.data,
      parsed.data,
    );
    return ok(lead);
  } catch (err: unknown) {
    if (isNotFoundError(err)) return notFound("Lead");
    if (isValidationError(err))
      return badRequest({ message: (err as Error).message });
    console.error("[PATCH /api/pipeline/:id/stage]", err);
    return serverError();
  }
}

function isNotFoundError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "PGRST116"
  );
}

function isValidationError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "VALIDATION_ERROR"
  );
}
