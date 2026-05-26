/**
 * GET /api/dashboard
 *
 * Retorna todos os dados necessários para o Dashboard:
 *   - kpiData     — métricas agregadas (clientes e leads reais do Supabase)
 *   - pipelineChartData — distribuição do funil (dados reais)
 *   - activities  — atividades recentes (vazio até tabela existir)
 *   - tasks       — próximas tarefas (dados reais)
 *   - atRiskClients — clientes com status "Em risco" (dados reais do Supabase)
 *
 * Response 200: { data: DashboardPayload }
 * Response 401: Unauthorized
 * Response 500: Internal Server Error
 */

import { createClient } from "@/lib/server";
import { ok, unauthorized, serverError } from "@/lib/api/response";
import type { Atividade, Task, Client, User, PipelineStage } from "@/lib/types";
import { TasksService } from "@/lib/services/tasks.service";
import { AtividadesService } from "@/lib/services/atividades.service";

import {
  PIPELINE_STAGE_CONFIG,
  PIPELINE_STAGES,
} from "@/lib/constants/pipeline";

// ── Tipos do payload ───────────────────────────────────────────────────────────
// ... (rest of types)

type KpiData = {
  totalClientes: number;
  clientesVariacao: number;
  leadsNoPipeline: number;
  leadsVariacao: number;
  campanhasAtivas: number;
  campanhasVariacao: number;
  faturamentoMes: number;
  faturamentoVariacao: number;
};

type PipelineChartItem = {
  stage: string;
  count: number;
  color: string;
};

export type DashboardPayload = {
  kpiData: KpiData;
  pipelineChartData: PipelineChartItem[];
  activities: Atividade[];
  tasks: Task[];
  atRiskClients: Client[];
};

// ── DB row shape ───────────────────────────────────────────────────────────────

interface ClientRow {
  id: string;
  name: string;
  logo: string | null;
  segment: string;
  status: Client["status"];
  responsible: User;
  contract_value: number;
  last_activity: string;
  onboarding_date: string;
  source: Client["source"];
  source_referrer: string | null;
  servicos_contratados: Client["servicos"];
  contact: { email: string; phone: string; website?: string };
}

function rowToClient(row: ClientRow): Client {
  return {
    id: row.id,
    name: row.name,
    logo: row.logo ?? undefined,
    segment: row.segment,
    status: row.status,
    responsible: row.responsible,
    contractValue: row.contract_value,
    lastActivity: new Date(row.last_activity),
    onboardingDate: new Date(row.onboarding_date),
    source: row.source,
    sourceReferrer: row.source_referrer ?? undefined,
    servicos: row.servicos_contratados ?? [],
    contact: row.contact,
  };
}

// ── Handler ────────────────────────────────────────────────────────────────────

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  try {
    // 1. Clientes
    const { data: clientRows, error: clientError } = await supabase
      .from("clientes")
      .select(
        "id, name, logo, segment, status, responsible, contract_value, last_activity, onboarding_date, source, source_referrer, servicos_contratados, contact",
      );

    if (clientError) throw clientError;

    const clients = ((clientRows ?? []) as ClientRow[]).map(rowToClient);
    const ativos = clients.filter((c) => c.status === "Ativo");
    const atRiskClients = clients.filter((c) => c.status === "Em risco");

    const totalClientes = ativos.length;
    const faturamentoMes = ativos.reduce((sum, c) => sum + c.contractValue, 0);

    // 2. Leads no Pipeline (Reais)
    const { data: leadRows, error: leadError } = await supabase
      .from("pipeline_leads")
      .select("stage");

    if (leadError) throw leadError;

    const leads = (leadRows ?? []) as { stage: PipelineStage }[];

    // Leads ativos: todos exceto 'fechado' e 'perdido'
    const leadsNoPipeline = leads.filter(
      (l) => l.stage !== "fechado" && l.stage !== "perdido",
    ).length;

    // 3. Pipeline Chart Data (por estágio comercial)
    const pipelineChartData: PipelineChartItem[] = PIPELINE_STAGES.map(
      (stageKey: PipelineStage) => {
        const config = PIPELINE_STAGE_CONFIG[stageKey];
        return {
          stage: config.label,
          count: leads.filter((l) => l.stage === stageKey).length,
          color: config.color,
        };
      },
    );

    // 4. Tarefas
    const tasks = await TasksService.list(supabase, {
      ownerId: user.id,
      limit: 5,
    });

    // 5. Atividades recentes — isolado para não derrubar o dashboard inteiro
    const activities = await AtividadesService.list(supabase, { limit: 10 }).catch(
      (err) => {
        console.error("[Dashboard] atividades fetch error:", err);
        return [];
      },
    );

    const kpiData: KpiData = {
      totalClientes,
      clientesVariacao: 0,
      leadsNoPipeline,
      leadsVariacao: 0,
      campanhasAtivas: 0,
      campanhasVariacao: 0,
      faturamentoMes,
      faturamentoVariacao: 0,
    };

    const payload: DashboardPayload = {
      kpiData,
      pipelineChartData,
      activities,
      tasks,
      atRiskClients,
    };

    return ok(payload);
  } catch (err) {
    console.error("[GET /api/dashboard]", err);
    return serverError();
  }
}
