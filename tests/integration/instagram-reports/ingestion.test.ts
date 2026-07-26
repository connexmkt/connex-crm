import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { ingestWeeklyReportMock, ingestMonthlyReportMock } = vi.hoisted(() => ({
  ingestWeeklyReportMock: vi.fn(),
  ingestMonthlyReportMock: vi.fn(),
}));

vi.mock("@/lib/server-admin", () => ({
  createCrmAdminClient: vi.fn(() => ({})),
}));

vi.mock("@/lib/services/instagram-reports-ingestion.service", () => ({
  InstagramReportsIngestionService: {
    ingestWeeklyReport: ingestWeeklyReportMock,
    ingestMonthlyReport: ingestMonthlyReportMock,
  },
}));

import { POST as postSemanais } from "@/app/api/integrations/connex-insights/relatorios-instagram/semanais/route";
import { POST as postMensais } from "@/app/api/integrations/connex-insights/relatorios-instagram/mensais/route";

const INGEST_SECRET = "test-secret";
const CLIENTE_ID = "5f4a2b3c-6e6a-4c4f-9b1a-1a2b3c4d5e6f";

const validWeeklyPayload = {
  sourceReportId: "insights-weekly-1",
  clienteId: CLIENTE_ID,
  referenceYear: 2026,
  referenceMonth: 7,
  referenceWeek: 4,
  periodStart: "2026-07-20",
  periodEnd: "2026-07-26",
  generatedAt: "2026-07-26T10:00:00.000Z",
  status: "AVAILABLE",
};

const validMonthlyPayload = {
  sourceReportId: "insights-monthly-1",
  clienteId: CLIENTE_ID,
  referenceYear: 2026,
  referenceMonth: 7,
  generatedAt: "2026-07-26T10:00:00.000Z",
  status: "AVAILABLE",
};

function buildRequest(endpoint: string, body: unknown, secret?: string) {
  return new NextRequest(`http://localhost${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(secret !== undefined && { "x-connex-insights-secret": secret }),
    },
    body: JSON.stringify(body),
  });
}

describe.each([
  {
    name: "semanais",
    endpoint: "/api/integrations/connex-insights/relatorios-instagram/semanais",
    post: () => postSemanais,
    validPayload: validWeeklyPayload,
    ingestMock: () => ingestWeeklyReportMock,
  },
  {
    name: "mensais",
    endpoint: "/api/integrations/connex-insights/relatorios-instagram/mensais",
    post: () => postMensais,
    validPayload: validMonthlyPayload,
    ingestMock: () => ingestMonthlyReportMock,
  },
])("POST .../relatorios-instagram/$name", ({ endpoint, post, validPayload, ingestMock }) => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CONNEX_INSIGHTS_INGEST_SECRET = INGEST_SECRET;
  });

  it("retorna 401 quando o header do segredo está ausente", async () => {
    const response = await post()(buildRequest(endpoint, validPayload));

    expect(response.status).toBe(401);
    expect(ingestMock()).not.toHaveBeenCalled();
  });

  it("retorna 401 quando o segredo enviado está incorreto", async () => {
    const response = await post()(buildRequest(endpoint, validPayload, "segredo-errado"));

    expect(response.status).toBe(401);
    expect(ingestMock()).not.toHaveBeenCalled();
  });

  it("retorna 400 para payload inválido mesmo com o segredo correto", async () => {
    const response = await post()(
      buildRequest(endpoint, { ...validPayload, clienteId: "não-é-um-uuid" }, INGEST_SECRET),
    );

    expect(response.status).toBe(400);
    expect(ingestMock()).not.toHaveBeenCalled();
  });

  it("retorna 404 quando o cliente não existe", async () => {
    ingestMock().mockResolvedValue({ status: "NOT_FOUND" });

    const response = await post()(buildRequest(endpoint, validPayload, INGEST_SECRET));

    expect(response.status).toBe(404);
  });

  it("retorna 201 quando o relatório é criado pela primeira vez", async () => {
    ingestMock().mockResolvedValue({ status: "SUCCEEDED", id: "report-1", action: "created" });

    const response = await post()(buildRequest(endpoint, validPayload, INGEST_SECRET));
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.data).toEqual({ id: "report-1", action: "created" });
  });

  it("retorna 200 quando o mesmo sourceReportId é reingerido (idempotente)", async () => {
    ingestMock().mockResolvedValue({ status: "SUCCEEDED", id: "report-1", action: "updated" });

    const response = await post()(buildRequest(endpoint, validPayload, INGEST_SECRET));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data).toEqual({ id: "report-1", action: "updated" });
  });

  it("retorna 500 quando a ingestão falha internamente", async () => {
    ingestMock().mockResolvedValue({ status: "FAILED" });

    const response = await post()(buildRequest(endpoint, validPayload, INGEST_SECRET));

    expect(response.status).toBe(500);
  });
});
