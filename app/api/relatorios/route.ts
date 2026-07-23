import { createClient } from "@/lib/server";
import { ok, unauthorized, serverError } from "@/lib/api/response";
import { STALE_THRESHOLD_DAYS } from "@/lib/constants/relatorios";
import type { Client, PipelineStage, LeadSource } from "@/lib/types";

export type Renewal = {
  id: string;
  name: string;
  renewalDate: string;
  contractValue: number;
};

export type StaleItem = {
  id: string;
  name: string;
  daysIdle: number;
  responsible: string;
};

export type MrrChartItem = { month: string; mrr: number; leads: number };

export type VisaoGeralData = {
  mrr: number;
  mrrPrev: number;
  activeClients: number;
  pipelineLeads: number;
  pipelineValue: number;
  conversionRate: number;
  mrrPlusClientsChart: MrrChartItem[];
  staleItems: StaleItem[];
  renewalsNext30: Renewal[];
};

export type StageBreakdownItem = {
  stage: string;
  label: string;
  count: number;
  totalValue: number;
  color: string;
};

export type StageConversionItem = { from: string; to: string; rate: number };
export type SourceItem = {
  source: string;
  label: string;
  count: number;
  won: number;
};
export type LostReasonItem = { reason: string; count: number };

export type LostLeadDetail = {
  id: string;
  name: string;
  stageLost: string;
  reason: string;
  responsible: string;
};

export type LeaderboardEntry = {
  userId: string;
  name: string;
  avatar?: string;
  dealsWon: number;
  valueWon: number;
};

export type PipelineData = {
  stageBreakdown: StageBreakdownItem[];
  funnelConversions: StageConversionItem[];
  finalCloseRate: number;
  sources: SourceItem[];
  lostReasons: LostReasonItem[];
  lostLeadsDetail: LostLeadDetail[];
  leaderboard: LeaderboardEntry[];
};

export type RevenueVsChurnItem = {
  month: string;
  gained: number;
  churned: number;
};

export type ClientSummary = { id: string; name: string; contractValue: number };

export type ClientesData = {
  ticketMedio: number;
  mrr: number;
  activeContracts: number;
  revenueVsChurn: RevenueVsChurnItem[];
  healthScore: { green: number; yellow: number; red: number };
  clientsByHealth: {
    healthy: ClientSummary[];
    atRisk: ClientSummary[];
    inactive: ClientSummary[];
  };
  renewalsNext30: Renewal[];
  renewalsNext60: Renewal[];
  ltvPlaceholder: true;
  inadimplenciaPlaceholder: true;
};

export type RelatoriosPayloadV2 = {
  visaoGeral: VisaoGeralData;
  pipeline: PipelineData;
  clientes: ClientesData;
};

interface ClientRow {
  id: string;
  name: string;
  status: Client["status"];
  contract_value: number;
  onboarding_date: string;
  contract_renewal_date: string | null;
}

interface PipelineLeadRow {
  id: string;
  company_name: string;
  stage: PipelineStage;
  created_at: string;
  stage_entered_at: string | null;
  estimated_value: number;
  source: LeadSource;
  lost_reason: string | null;
  responsible: { id: string; name: string; avatar?: string } | null;
  stale_after_days: number;
}

const MONTHS_PT = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

const STAGE_CONFIG: Record<PipelineStage, { label: string; color: string }> = {
  novo_lead: { label: "Novo Lead", color: "#5B5FE8" },
  em_contato: { label: "Em Contato", color: "#14B8A6" },
  reuniao_agendada: { label: "Reunião Agendada", color: "#8B5CF6" },
  proposta_enviada: { label: "Proposta Enviada", color: "#F59E0B" },
  negociacao: { label: "Negociação", color: "#EC4899" },
  fechado: { label: "Fechado", color: "#22C55E" },
  perdido: { label: "Perdido", color: "#EF4444" },
};

const ALL_STAGES: PipelineStage[] = [
  "novo_lead",
  "em_contato",
  "reuniao_agendada",
  "proposta_enviada",
  "negociacao",
  "fechado",
  "perdido",
];

const ACTIVE_STAGES: PipelineStage[] = [
  "novo_lead",
  "em_contato",
  "reuniao_agendada",
  "proposta_enviada",
  "negociacao",
];

const SOURCE_LABELS: Record<LeadSource, string> = {
  prospeccao: "Prospecção",
  indicacao: "Indicação",
  instagram: "Instagram",
  site: "Site",
  evento: "Evento",
};

function buildMrrPlusClientsChart(
  clients: ClientRow[],
  leads: PipelineLeadRow[],
  year: number,
): MrrChartItem[] {
  return MONTHS_PT.map((month, m) => {
    const endOfMonth = new Date(year, m + 1, 0, 23, 59, 59);

    const mrr = clients
      .filter(
        (c) =>
          c.status === "Ativo" && new Date(c.onboarding_date) <= endOfMonth,
      )
      .reduce((s, c) => s + (c.contract_value || 0), 0);

    const activeLeads = leads.filter((l) => {
      if (new Date(l.created_at) > endOfMonth) return false;
      if (l.stage === "fechado" || l.stage === "perdido") {
        return l.stage_entered_at
          ? new Date(l.stage_entered_at) > endOfMonth
          : false;
      }
      return true;
    }).length;

    return { month, mrr, leads: activeLeads };
  });
}

function buildStaleItems(leads: PipelineLeadRow[]): StaleItem[] {
  const now = Date.now();
  return leads
    .filter((l) => {
      if (l.stage === "fechado" || l.stage === "perdido") return false;
      if (!l.stage_entered_at) return false;
      const days = Math.floor(
        (now - new Date(l.stage_entered_at).getTime()) / 86_400_000,
      );
      return days > (l.stale_after_days || STALE_THRESHOLD_DAYS);
    })
    .map((l) => ({
      id: l.id,
      name: l.company_name,
      daysIdle: Math.floor(
        (now - new Date(l.stage_entered_at!).getTime()) / 86_400_000,
      ),
      responsible: l.responsible?.name ?? "—",
    }))
    .sort((a, b) => b.daysIdle - a.daysIdle);
}

function buildRenewals(clients: ClientRow[]): {
  next30: Renewal[];
  next60: Renewal[];
} {
  const now = new Date();
  const plus30 = new Date(now);
  plus30.setDate(plus30.getDate() + 30);
  const plus60 = new Date(now);
  plus60.setDate(plus60.getDate() + 60);

  const toRenewal = (c: ClientRow): Renewal => ({
    id: c.id,
    name: c.name,
    renewalDate: c.contract_renewal_date!,
    contractValue: c.contract_value,
  });

  const next30 = clients
    .filter((c) => {
      if (!c.contract_renewal_date) return false;
      const d = new Date(c.contract_renewal_date);
      return d >= now && d <= plus30;
    })
    .map(toRenewal)
    .sort((a, b) => a.renewalDate.localeCompare(b.renewalDate));

  const next60 = clients
    .filter((c) => {
      if (!c.contract_renewal_date) return false;
      const d = new Date(c.contract_renewal_date);
      return d > plus30 && d <= plus60;
    })
    .map(toRenewal)
    .sort((a, b) => a.renewalDate.localeCompare(b.renewalDate));

  return { next30, next60 };
}

function buildVisaoGeralData(
  clients: ClientRow[],
  leads: PipelineLeadRow[],
  chart: MrrChartItem[],
  currentMonth: number,
): VisaoGeralData {
  const mrr = clients
    .filter((c) => c.status === "Ativo")
    .reduce((s, c) => s + (c.contract_value || 0), 0);

  const nonTerminal = leads.filter(
    (l) => l.stage !== "fechado" && l.stage !== "perdido",
  );
  const closedCount = leads.filter((l) => l.stage === "fechado").length;

  return {
    mrr,
    mrrPrev: currentMonth > 0 ? (chart[currentMonth - 1]?.mrr ?? 0) : 0,
    activeClients: clients.filter((c) => c.status === "Ativo").length,
    pipelineLeads: nonTerminal.length,
    pipelineValue: nonTerminal.reduce(
      (s, l) => s + (l.estimated_value || 0),
      0,
    ),
    conversionRate:
      leads.length > 0 ? Math.round((closedCount / leads.length) * 100) : 0,
    mrrPlusClientsChart: chart,
    staleItems: buildStaleItems(leads),
    renewalsNext30: buildRenewals(clients).next30,
  };
}

function buildPipelineData(leads: PipelineLeadRow[]): PipelineData {
  const stageBreakdown: StageBreakdownItem[] = ALL_STAGES.map((stage) => {
    const inStage = leads.filter((l) => l.stage === stage);
    return {
      stage,
      label: STAGE_CONFIG[stage].label,
      count: inStage.length,
      totalValue: inStage.reduce((s, l) => s + (l.estimated_value || 0), 0),
      color: STAGE_CONFIG[stage].color,
    };
  });

  const funnelConversions: StageConversionItem[] = [];
  for (let i = 0; i < ACTIVE_STAGES.length - 1; i++) {
    const countAtOrPast = (from: number) =>
      leads.filter((l) => {
        if (l.stage === "perdido") return false;
        if (l.stage === "fechado") return true;
        return ACTIVE_STAGES.indexOf(l.stage) >= from;
      }).length;

    const atCurr = countAtOrPast(i);
    const atNext = countAtOrPast(i + 1);
    funnelConversions.push({
      from: STAGE_CONFIG[ACTIVE_STAGES[i]].label,
      to: STAGE_CONFIG[ACTIVE_STAGES[i + 1]].label,
      rate: atCurr > 0 ? Math.round((atNext / atCurr) * 100) : 0,
    });
  }

  const sourceMap = new Map<string, { count: number; won: number }>();
  for (const lead of leads) {
    const src = lead.source ?? "site";
    const entry = sourceMap.get(src) ?? { count: 0, won: 0 };
    entry.count++;
    if (lead.stage === "fechado") entry.won++;
    sourceMap.set(src, entry);
  }

  const lostMap = new Map<string, number>();
  for (const lead of leads) {
    if (lead.stage === "perdido" && lead.lost_reason) {
      lostMap.set(lead.lost_reason, (lostMap.get(lead.lost_reason) ?? 0) + 1);
    }
  }

  const leaderMap = new Map<
    string,
    { name: string; avatar?: string; dealsWon: number; valueWon: number }
  >();
  for (const lead of leads) {
    if (lead.stage !== "fechado" || !lead.responsible) continue;
    const uid = lead.responsible.id;
    const entry = leaderMap.get(uid) ?? {
      name: lead.responsible.name,
      avatar: lead.responsible.avatar,
      dealsWon: 0,
      valueWon: 0,
    };
    entry.dealsWon++;
    entry.valueWon += lead.estimated_value || 0;
    leaderMap.set(uid, entry);
  }

  return {
    stageBreakdown,
    funnelConversions,
    finalCloseRate:
      leads.length > 0
        ? Math.round(
            (leads.filter((l) => l.stage === "fechado").length / leads.length) *
              100,
          )
        : 0,
    sources: Array.from(sourceMap.entries())
      .map(([source, d]) => ({
        source,
        label: SOURCE_LABELS[source as LeadSource] ?? source,
        count: d.count,
        won: d.won,
      }))
      .sort((a, b) => b.count - a.count),
    lostReasons: Array.from(lostMap.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count),
    lostLeadsDetail: leads
      .filter((l) => l.stage === "perdido")
      .map((l) => ({
        id: l.id,
        name: l.company_name,
        stageLost: STAGE_CONFIG.perdido.label,
        reason: l.lost_reason ?? "—",
        responsible: l.responsible?.name ?? "—",
      })),
    leaderboard: Array.from(leaderMap.entries())
      .map(([userId, d]) => ({ userId, ...d }))
      .sort((a, b) => b.dealsWon - a.dealsWon),
  };
}

function buildRevenueVsChurn(
  clients: ClientRow[],
  year: number,
): RevenueVsChurnItem[] {
  // gained = soma de contract_value de clientes com onboarding_date no mês
  // churned = 0 — tabela de cancelamentos ainda não implementada
  return MONTHS_PT.map((month, m) => {
    const start = new Date(year, m, 1);
    const end = new Date(year, m + 1, 0, 23, 59, 59);
    const gained = clients
      .filter((c) => {
        const d = new Date(c.onboarding_date);
        return d >= start && d <= end;
      })
      .reduce((s, c) => s + (c.contract_value || 0), 0);
    return { month, gained, churned: 0 };
  });
}

function buildClientesData(clients: ClientRow[], year: number): ClientesData {
  const active = clients.filter((c) => c.status === "Ativo");
  const mrr = active.reduce((s, c) => s + (c.contract_value || 0), 0);
  const activeContracts = active.length;
  const { next30, next60 } = buildRenewals(clients);

  return {
    ticketMedio: activeContracts > 0 ? mrr / activeContracts : 0,
    mrr,
    activeContracts,
    revenueVsChurn: buildRevenueVsChurn(clients, year),
    healthScore: {
      green: clients.filter((c) => c.status === "Ativo").length,
      yellow: clients.filter((c) => c.status === "Em risco").length,
      red: clients.filter((c) => c.status === "Inativo").length,
    },
    clientsByHealth: {
      healthy: active.map((c) => ({
        id: c.id,
        name: c.name,
        contractValue: c.contract_value,
      })),
      atRisk: clients
        .filter((c) => c.status === "Em risco")
        .map((c) => ({
          id: c.id,
          name: c.name,
          contractValue: c.contract_value,
        })),
      inactive: clients
        .filter((c) => c.status === "Inativo")
        .map((c) => ({
          id: c.id,
          name: c.name,
          contractValue: c.contract_value,
        })),
    },
    renewalsNext30: next30,
    renewalsNext60: next60,
    ltvPlaceholder: true,
    inadimplenciaPlaceholder: true,
  };
}

export async function GET(): Promise<Response> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  try {
    const [clientRes, leadRes] = await Promise.all([
      supabase
        .from("clientes")
        .select(
          "id, name, status, contract_value, onboarding_date, contract_renewal_date",
        )
        .order("onboarding_date", { ascending: true }),

      supabase
        .from("pipeline_leads")
        .select(
          "id, company_name, stage, created_at, stage_entered_at, estimated_value, source, lost_reason, responsible, stale_after_days",
        ),
    ]);

    if (clientRes.error) throw clientRes.error;
    if (leadRes.error) throw leadRes.error;

    const clients = (clientRes.data ?? []) as ClientRow[];
    const leads = (leadRes.data ?? []) as PipelineLeadRow[];

    const now = new Date();
    const chart = buildMrrPlusClientsChart(clients, leads, now.getFullYear());

    const payload: RelatoriosPayloadV2 = {
      visaoGeral: buildVisaoGeralData(clients, leads, chart, now.getMonth()),
      pipeline: buildPipelineData(leads),
      clientes: buildClientesData(clients, now.getFullYear()),
    };

    return ok(payload);
  } catch (err) {
    console.error("[GET /api/relatorios] user:", user.id, err);
    return serverError();
  }
}
