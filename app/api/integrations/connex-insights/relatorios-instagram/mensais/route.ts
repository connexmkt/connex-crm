export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { createCrmAdminClient } from "@/lib/server-admin";
import { verifyIngestSecret } from "@/lib/api/verify-ingest-secret";
import { monthlyReportIngestSchema } from "@/lib/schemas/instagram-reports/monthly-report-ingest.schema";
import { InstagramReportsIngestionService } from "@/lib/services/instagram-reports-ingestion.service";
import {
  ok,
  created,
  badRequest,
  unauthorized,
  notFound,
  serverError,
} from "@/lib/api/response";

const ENDPOINT =
  "/api/integrations/connex-insights/relatorios-instagram/mensais";

/**
 * Ingestão service-to-service (Connex Insights → Connex CRM) de relatórios
 * mensais de Instagram já processados — ver contracts/instagram-reports-ingestion-api.yaml.
 */
export async function POST(request: NextRequest) {
  if (!verifyIngestSecret(request, ENDPOINT)) {
    return unauthorized();
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return badRequest({ message: "JSON inválido no corpo da requisição" });
  }

  const parsed = monthlyReportIngestSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.flatten());

  try {
    const admin = createCrmAdminClient();
    const result = await InstagramReportsIngestionService.ingestMonthlyReport(
      admin,
      parsed.data,
    );

    switch (result.status) {
      case "NOT_FOUND":
        return notFound("Cliente");
      case "SUCCEEDED":
        return result.action === "created"
          ? created({ id: result.id, action: result.action })
          : ok({ id: result.id, action: result.action });
      case "FAILED":
        return serverError();
      default: {
        const _exhaustive: never = result;
        throw new Error(
          `Status de ingestão não tratado: ${JSON.stringify(_exhaustive)}`,
        );
      }
    }
  } catch (err) {
    console.error(`[POST ${ENDPOINT}]`, err);
    return serverError();
  }
}
