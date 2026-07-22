/**
 * GET /api/aplicacoes/connex-insights/usuarios
 *
 * Lista usuários do Connex Insights, paginada, com nome do tenant (FR-007).
 * Query params: page? (default 1), limit? (default 20, max 100).
 * Somente Admin do CRM (SEC-002).
 *
 * Response 200: { data: { items: ConnexInsightsUserRow[], total, page, limit } }
 *
 * ─────────────────────────────────────────────────────────────────────────
 *
 * POST /api/aplicacoes/connex-insights/usuarios
 *
 * Cria um novo usuário no Connex Insights (FR-012 a FR-017). Body:
 *   name string, email string, login string, tenantId string (uuid).
 *
 * Response 201: { data: { temporaryPassword, profileId } }
 * Response 400: Bad Request (validação Zod)
 * Response 401: Unauthorized
 * Response 403: Forbidden
 * Response 404: Tenant não encontrado
 * Response 409: E-mail/login já em uso
 * Response 502: Falha de comunicação com o Connex Insights
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/server";
import { checkAdmin } from "@/lib/auth/require-admin";
import { criarUsuarioSchema } from "@/app/aplicacoes/schemas/criar-usuario.schema";
import { createConnexInsightsAdminClient } from "@/lib/integrations/connex-insights/admin-client";
import { ConnexInsightsRemoteRepository } from "@/lib/repositories/connex-insights-remote.repository";
import { ConnexInsightsProvisioningService } from "@/lib/services/connex-insights-provisioning.service";
import {
  ok,
  created,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  badGateway,
  serverError,
} from "@/lib/api/response";

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export async function GET(request: NextRequest) {
  const auth = await checkAdmin();
  if (!auth.ok) {
    return auth.reason === "unauthenticated" ? unauthorized() : forbidden();
  }

  const parsed = listQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return badRequest(parsed.error.flatten());

  try {
    const admin = createConnexInsightsAdminClient();
    const result = await ConnexInsightsRemoteRepository.listUsers(
      admin,
      parsed.data.page,
      parsed.data.limit,
    );
    return ok({ ...result, page: parsed.data.page, limit: parsed.data.limit });
  } catch (err) {
    console.error("[GET /api/aplicacoes/connex-insights/usuarios]", err);
    return badGateway();
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const auth = await checkAdmin();
  if (!auth.ok) {
    return auth.reason === "unauthenticated" ? unauthorized() : forbidden();
  }

  const body = await request.json().catch(() => null);
  if (!body) return badRequest({ message: "JSON inválido no corpo da requisição" });

  const parsed = criarUsuarioSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.flatten());

  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();

  try {
    const outcome = await ConnexInsightsProvisioningService.createUser(
      parsed.data,
      { requestedByProfileId: auth.userId, requestId },
      supabase,
    );

    switch (outcome.status) {
      case "SUCCEEDED":
        return created({
          temporaryPassword: outcome.temporaryPassword,
          profileId: outcome.profileId,
        });
      case "FAILED_DUPLICATE":
        return conflict(
          "Já existe um usuário com este e-mail ou login. Verifique os dados e tente novamente.",
        );
      case "TENANT_NOT_FOUND":
        return notFound("Tenant");
      case "FAILED_ERROR":
        return badGateway();
      default: {
        const _exhaustive: never = outcome;
        throw new Error(`Status de provisionamento não tratado: ${JSON.stringify(_exhaustive)}`);
      }
    }
  } catch (err) {
    console.error("[POST /api/aplicacoes/connex-insights/usuarios]", err);
    return serverError();
  }
}
