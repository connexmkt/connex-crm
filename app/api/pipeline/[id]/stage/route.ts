import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/server";
import { PipelineService } from "@/lib/services/pipeline.service";
import { NotificationsService } from "@/lib/services/notifications.service";

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

const STAGE_LABELS: Record<(typeof PIPELINE_STAGES)[number], string> = {
  novo_lead: "Novo Lead",
  em_contato: "Em Contato",
  reuniao_agendada: "Reunião Agendada",
  proposta_enviada: "Proposta Enviada",
  negociacao: "Negociação",
  fechado: "Fechado",
  perdido: "Perdido",
};

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

    const stageLabel = STAGE_LABELS[parsed.data.stage];
    const notificationType =
      parsed.data.stage === "fechado"
        ? "success"
        : parsed.data.stage === "perdido"
          ? "warning"
          : "info";

    NotificationsService.broadcast(supabase, {
      title: `Lead movido: ${lead.companyName}`,
      message: `${lead.companyName} avançou para "${stageLabel}"`,
      type: notificationType,
    }).catch((err) =>
      console.error("[notifications] broadcast erro (mover lead):", err),
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
