export const runtime = "nodejs";

import { createClient } from "@/lib/server";
import { checkAuth } from "@/lib/auth/require-auth";
import { ConnexInsightsUserManagementService } from "@/lib/services/connex-insights-user-management.service";
import {
  ok,
  unauthorized,
  notFound,
  conflict,
  badGateway,
  serverError,
} from "@/lib/api/response";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const supabase = await createClient();
  const auth = await checkAuth();
  if (!auth.ok) {
    return unauthorized();
  }

  const { userId } = await params;
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();

  try {
    const outcome = await ConnexInsightsUserManagementService.reactivateUser(
      userId,
      { requestedByProfileId: auth.userId, requestId },
      supabase,
    );

    switch (outcome.status) {
      case "SUCCEEDED":
        return ok({ status: "ACTIVE" });
      case "NOT_FOUND":
        return notFound("Usuário");
      case "INVALID_STATE":
        return conflict(
          "Usuário não está inativado. Atualize a lista e tente novamente.",
        );
      case "FAILED_ERROR":
        return badGateway();
      default: {
        const _exhaustive: never = outcome;
        throw new Error(
          `Status de reativação não tratado: ${JSON.stringify(_exhaustive)}`,
        );
      }
    }
  } catch (err) {
    console.error(
      "[POST /api/aplicacoes/connex-insights/usuarios/[userId]/reativar]",
      err,
    );
    return serverError();
  }
}
