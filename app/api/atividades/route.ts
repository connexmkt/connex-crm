import { createClient } from "@/lib/server";
import {
  ok,
  created,
  badRequest,
  unauthorized,
  serverError,
} from "@/lib/api/response";
import { AtividadesService } from "@/lib/services/atividades.service";
import type { AtividadeTipo, AtividadeAssociacaoTipo } from "@/lib/types";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? "20"), 50);
  const associacaoTipo = searchParams.get(
    "associacaoTipo",
  ) as AtividadeAssociacaoTipo | null;
  const associacaoId = searchParams.get("associacaoId") ?? undefined;
  const responsavelId = searchParams.get("responsavelId") ?? undefined;

  try {
    const atividades = await AtividadesService.list(supabase, {
      limit,
      associacaoTipo: associacaoTipo ?? undefined,
      associacaoId,
      responsavelId,
    });
    return ok(atividades);
  } catch (err) {
    console.error("[GET /api/atividades]", err);
    return serverError();
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("JSON inválido");
  }

  const {
    tipo,
    associacaoTipo,
    associacaoId,
    associacaoNome,
    responsavelId,
    ocorridoEm,
    descricao,
    resultado,
    proximoPasso,
  } = body as Record<string, string>;

  const TIPOS_VALIDOS: AtividadeTipo[] = [
    "reuniao",
    "ligacao",
    "email",
    "mensagem",
    "proposta",
    "contrato",
  ];
  const ASSOC_VALIDOS: AtividadeAssociacaoTipo[] = ["cliente", "lead"];

  if (!tipo || !TIPOS_VALIDOS.includes(tipo as AtividadeTipo)) {
    return badRequest('Campo "tipo" inválido ou ausente');
  }
  if (
    !associacaoTipo ||
    !ASSOC_VALIDOS.includes(associacaoTipo as AtividadeAssociacaoTipo)
  ) {
    return badRequest('Campo "associacaoTipo" inválido ou ausente');
  }
  if (!associacaoId) return badRequest('Campo "associacaoId" é obrigatório');
  if (!associacaoNome)
    return badRequest('Campo "associacaoNome" é obrigatório');
  if (!responsavelId) return badRequest('Campo "responsavelId" é obrigatório');
  if (!descricao?.trim()) return badRequest('Campo "descricao" é obrigatório');

  try {
    const atividade = await AtividadesService.create(supabase, {
      tipo: tipo as AtividadeTipo,
      associacaoTipo: associacaoTipo as AtividadeAssociacaoTipo,
      associacaoId,
      associacaoNome,
      responsavelId,
      ocorridoEm: ocorridoEm ? new Date(ocorridoEm) : new Date(),
      descricao: descricao.trim(),
      resultado: resultado?.trim() || undefined,
      proximoPasso: proximoPasso?.trim() || undefined,
    });
    return created(atividade);
  } catch (err) {
    console.error("[POST /api/atividades]", err);
    return serverError();
  }
}
