/**
 * GET /api/relatorios
 *
 * Retorna todos os dados necessários para a página de Relatórios em 5 blocos:
 *   - overview   — KPIs gerais + gráficos mensais de MRR e crescimento de leads
 *   - sales      — breakdown por etapa, conversões, canais e motivos de perda
 *   - cs         — health score, renovações, volume de conteúdo, churn snapshot
 *   - financial  — ticket médio, MRR, contratos ativos + placeholders
 *   - activity   — leaderboard de vendas, interações recentes, itens parados
 *
 * Response 200: { data: RelatoriosPayload }
 * Response 401: Unauthorized
 * Response 500: Internal Server Error
 */

import { createClient } from '@/lib/server'
import { ok, unauthorized, serverError } from '@/lib/api/response'
import type { Client, PipelineStage, LeadSource } from '@/lib/types'

// ── Tipos do payload ─────────────────────────────────────────────────────────

export type RevenueItem = { month: string; value: number }
export type ClientGrowthItem = { month: string; leads: number }

export type OverviewData = {
  mrr: number
  mrrPrev: number
  activeClients: number
  activeClientsPrev: number
  pipelineLeads: number
  pipelineValue: number
  conversionRate: number
  revenueByMonth: RevenueItem[]
  leadsByMonth: ClientGrowthItem[]
}

export type StageBreakdownItem = {
  stage: string
  label: string
  count: number
  totalValue: number
  color: string
}

export type StageConversionItem = {
  from: string
  to: string
  rate: number
}

export type SourceItem = {
  source: string
  label: string
  count: number
  won: number
}

export type LostReasonItem = {
  reason: string
  count: number
}

export type SalesData = {
  stageBreakdown: StageBreakdownItem[]
  stageConversions: StageConversionItem[]
  finalCloseRate: number
  sources: SourceItem[]
  lostReasons: LostReasonItem[]
}

export type Renewal = {
  id: string
  name: string
  renewalDate: string
  contractValue: number
}

export type CsData = {
  healthScore: { green: number; yellow: number; red: number }
  renewalsNext30: Renewal[]
  renewalsNext60: Renewal[]
  contentVolume: Array<{ status: string; count: number }>
  churnSnapshot: { inactiveCount: number; activeCount: number }
}

export type FinancialData = {
  ticketMedio: number
  mrr: number
  activeContracts: number
  ltvPlaceholder: true
  inadimplenciaPlaceholder: true
}

export type ActivityData = {
  salesLeaderboard: Array<{
    userId: string
    name: string
    avatar?: string
    dealsWon: number
    valueWon: number
    interactions: number
  }>
  recentInteractions: Array<{
    id: string
    kind: string
    description: string
    leadName: string
    occurredAt: string
    by: string
  }>
  staleItems: Array<{
    id: string
    type: 'lead' | 'cliente'
    name: string
    daysIdle: number
    responsible: string
  }>
}

export type RelatoriosPayload = {
  overview: OverviewData
  sales: SalesData
  cs: CsData
  financial: FinancialData
  activity: ActivityData
}

// ── DB row shapes ─────────────────────────────────────────────────────────────

interface ClientRow {
  id: string
  name: string
  status: Client['status']
  contract_value: number
  onboarding_date: string
  contract_renewal_date: string | null
}

interface PipelineLeadRow {
  id: string
  company_name: string
  stage: PipelineStage
  created_at: string
  stage_entered_at: string | null
  estimated_value: number
  source: LeadSource
  lost_reason: string | null
  responsible: { id: string; name: string; avatar?: string } | null
  stale_after_days: number
}

interface InteractionRow {
  id: string
  kind: string
  description: string | null
  occurred_at: string
  created_by: string | null
  lead: { company_name: string } | null
}

interface ConteudoRow {
  status: string
}

// ── Constantes ────────────────────────────────────────────────────────────────

const MONTHS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

const STAGE_CONFIG: Record<PipelineStage, { label: string; color: string }> = {
  novo_lead:        { label: 'Novo Lead',        color: '#5B5FE8' },
  em_contato:       { label: 'Em Contato',        color: '#14B8A6' },
  reuniao_agendada: { label: 'Reunião Agendada',  color: '#8B5CF6' },
  proposta_enviada: { label: 'Proposta Enviada',  color: '#F59E0B' },
  negociacao:       { label: 'Negociação',        color: '#EC4899' },
  fechado:          { label: 'Fechado',           color: '#22C55E' },
  perdido:          { label: 'Perdido',           color: '#EF4444' },
}

const ALL_STAGES: PipelineStage[] = [
  'novo_lead', 'em_contato', 'reuniao_agendada', 'proposta_enviada', 'negociacao', 'fechado', 'perdido',
]

const ACTIVE_STAGES: PipelineStage[] = [
  'novo_lead', 'em_contato', 'reuniao_agendada', 'proposta_enviada', 'negociacao',
]

const SOURCE_LABELS: Record<LeadSource, string> = {
  prospeccao: 'Prospecção',
  indicacao:  'Indicação',
  instagram:  'Instagram',
  site:       'Site',
  evento:     'Evento',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Snapshot de leads ativos no fim de cada mês do ano corrente.
 * Lead conta se created_at <= fimDoMes e não estava em estado terminal naquele instante.
 */
function buildActiveLeadsByMonth(
  leads: PipelineLeadRow[],
  year: number,
): ClientGrowthItem[] {
  return MONTHS_PT.map((month, m) => {
    const endOfMonth = new Date(year, m + 1, 0, 23, 59, 59)

    const active = leads.filter((lead) => {
      if (new Date(lead.created_at) > endOfMonth) return false
      const isTerminal = lead.stage === 'fechado' || lead.stage === 'perdido'
      if (!isTerminal) return true
      if (!lead.stage_entered_at) return false
      return new Date(lead.stage_entered_at) > endOfMonth
    })

    return { month, leads: active.length }
  })
}

/**
 * Soma de contract_value dos clientes Ativos no fim de cada mês do ano corrente.
 */
function buildRevenueData(rows: ClientRow[], year: number): RevenueItem[] {
  return MONTHS_PT.map((month, m) => {
    const endOfMonth = new Date(year, m + 1, 0, 23, 59, 59)

    const revenue = rows
      .filter((r) => r.status === 'Ativo' && new Date(r.onboarding_date) <= endOfMonth)
      .reduce((sum, r) => sum + (r.contract_value || 0), 0)

    return { month, value: revenue }
  })
}

function buildOverviewData(
  clients: ClientRow[],
  leads: PipelineLeadRow[],
  revenueByMonth: RevenueItem[],
  leadsByMonth: ClientGrowthItem[],
  currentMonth: number,
): OverviewData {
  const mrr = clients
    .filter((c) => c.status === 'Ativo')
    .reduce((s, c) => s + (c.contract_value || 0), 0)

  const mrrPrev = currentMonth > 0 ? (revenueByMonth[currentMonth - 1]?.value ?? 0) : 0

  const activeClients = clients.filter((c) => c.status === 'Ativo').length
  const activeClientsPrev = currentMonth > 0 ? (leadsByMonth[currentMonth - 1]?.leads ?? 0) : 0

  const nonTerminal = leads.filter((l) => l.stage !== 'fechado' && l.stage !== 'perdido')
  const pipelineLeads = nonTerminal.length
  const pipelineValue = nonTerminal.reduce((s, l) => s + (l.estimated_value || 0), 0)

  const closedCount = leads.filter((l) => l.stage === 'fechado').length
  const conversionRate = leads.length > 0 ? Math.round((closedCount / leads.length) * 100) : 0

  return {
    mrr,
    mrrPrev,
    activeClients,
    activeClientsPrev,
    pipelineLeads,
    pipelineValue,
    conversionRate,
    revenueByMonth,
    leadsByMonth,
  }
}

function buildSalesData(leads: PipelineLeadRow[]): SalesData {
  // Breakdown por etapa
  const stageBreakdown: StageBreakdownItem[] = ALL_STAGES.map((stage) => {
    const inStage = leads.filter((l) => l.stage === stage)
    return {
      stage,
      label: STAGE_CONFIG[stage].label,
      count: inStage.length,
      totalValue: inStage.reduce((s, l) => s + (l.estimated_value || 0), 0),
      color: STAGE_CONFIG[stage].color,
    }
  })

  // Conversões entre etapas (funil)
  const stageConversions: StageConversionItem[] = []
  for (let i = 0; i < ACTIVE_STAGES.length - 1; i++) {
    const countAtOrPast = (from: number) =>
      leads.filter((l) => {
        if (l.stage === 'perdido') return false
        if (l.stage === 'fechado') return true
        return ACTIVE_STAGES.indexOf(l.stage) >= from
      }).length

    const atCurr = countAtOrPast(i)
    const atNext = countAtOrPast(i + 1)
    const rate = atCurr > 0 ? Math.round((atNext / atCurr) * 100) : 0

    stageConversions.push({
      from: STAGE_CONFIG[ACTIVE_STAGES[i]].label,
      to: STAGE_CONFIG[ACTIVE_STAGES[i + 1]].label,
      rate,
    })
  }

  const total = leads.length
  const closedCount = leads.filter((l) => l.stage === 'fechado').length
  const finalCloseRate = total > 0 ? Math.round((closedCount / total) * 100) : 0

  // Canais de origem
  const sourceMap = new Map<string, { count: number; won: number }>()
  for (const lead of leads) {
    const src = lead.source ?? 'site'
    const entry = sourceMap.get(src) ?? { count: 0, won: 0 }
    entry.count++
    if (lead.stage === 'fechado') entry.won++
    sourceMap.set(src, entry)
  }
  const sources: SourceItem[] = Array.from(sourceMap.entries())
    .map(([source, data]) => ({
      source,
      label: SOURCE_LABELS[source as LeadSource] ?? source,
      count: data.count,
      won: data.won,
    }))
    .sort((a, b) => b.count - a.count)

  // Motivos de perda
  const lostMap = new Map<string, number>()
  for (const lead of leads) {
    if (lead.stage === 'perdido' && lead.lost_reason) {
      lostMap.set(lead.lost_reason, (lostMap.get(lead.lost_reason) ?? 0) + 1)
    }
  }
  const lostReasons: LostReasonItem[] = Array.from(lostMap.entries())
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count)

  return { stageBreakdown, stageConversions, finalCloseRate, sources, lostReasons }
}

function buildCsData(
  clients: ClientRow[],
  contentVolume: Array<{ status: string; count: number }>,
): CsData {
  const healthScore = {
    green:  clients.filter((c) => c.status === 'Ativo').length,
    yellow: clients.filter((c) => c.status === 'Em risco').length,
    red:    clients.filter((c) => c.status === 'Inativo').length,
  }

  const now = new Date()
  const plus30 = new Date(now)
  plus30.setDate(plus30.getDate() + 30)
  const plus60 = new Date(now)
  plus60.setDate(plus60.getDate() + 60)

  const toRenewal = (c: ClientRow): Renewal => ({
    id: c.id,
    name: c.name,
    renewalDate: c.contract_renewal_date!,
    contractValue: c.contract_value,
  })

  const renewalsNext30 = clients
    .filter((c) => {
      if (!c.contract_renewal_date) return false
      const d = new Date(c.contract_renewal_date)
      return d >= now && d <= plus30
    })
    .map(toRenewal)
    .sort((a, b) => a.renewalDate.localeCompare(b.renewalDate))

  const renewalsNext60 = clients
    .filter((c) => {
      if (!c.contract_renewal_date) return false
      const d = new Date(c.contract_renewal_date)
      return d > plus30 && d <= plus60
    })
    .map(toRenewal)
    .sort((a, b) => a.renewalDate.localeCompare(b.renewalDate))

  const churnSnapshot = {
    inactiveCount: clients.filter((c) => c.status === 'Inativo').length,
    activeCount:   clients.filter((c) => c.status === 'Ativo').length,
  }

  return { healthScore, renewalsNext30, renewalsNext60, contentVolume, churnSnapshot }
}

function buildFinancialData(clients: ClientRow[]): FinancialData {
  const mrr = clients
    .filter((c) => c.status === 'Ativo')
    .reduce((s, c) => s + (c.contract_value || 0), 0)

  const activeContracts = clients.filter((c) => c.status === 'Ativo').length
  const ticketMedio = activeContracts > 0 ? mrr / activeContracts : 0

  return { ticketMedio, mrr, activeContracts, ltvPlaceholder: true, inadimplenciaPlaceholder: true }
}

function buildActivityData(
  leads: PipelineLeadRow[],
  interactions: InteractionRow[],
): ActivityData {
  // Leaderboard — agrupa leads fechados por responsável
  const leaderMap = new Map<string, { name: string; avatar?: string; dealsWon: number; valueWon: number }>()
  for (const lead of leads) {
    if (lead.stage !== 'fechado' || !lead.responsible) continue
    const uid = lead.responsible.id
    const entry = leaderMap.get(uid) ?? { name: lead.responsible.name, avatar: lead.responsible.avatar, dealsWon: 0, valueWon: 0 }
    entry.dealsWon++
    entry.valueWon += lead.estimated_value || 0
    leaderMap.set(uid, entry)
  }
  const salesLeaderboard = Array.from(leaderMap.entries())
    .map(([userId, data]) => ({ userId, ...data, interactions: 0 }))
    .sort((a, b) => b.dealsWon - a.dealsWon)

  // Interações recentes
  const recentInteractions = interactions.map((i) => ({
    id: i.id,
    kind: i.kind,
    description: i.description ?? '',
    leadName: i.lead?.company_name ?? '—',
    occurredAt: i.occurred_at,
    by: i.created_by ?? '—',
  }))

  // Itens parados (leads com is_stale)
  const now = Date.now()
  const staleItems = leads
    .filter((l) => {
      if (l.stage === 'fechado' || l.stage === 'perdido') return false
      if (!l.stage_entered_at) return false
      const daysInStage = Math.floor((now - new Date(l.stage_entered_at).getTime()) / 86_400_000)
      return daysInStage > (l.stale_after_days || 7)
    })
    .map((l) => {
      const daysIdle = Math.floor((now - new Date(l.stage_entered_at!).getTime()) / 86_400_000)
      return {
        id: l.id,
        type: 'lead' as const,
        name: l.company_name,
        daysIdle,
        responsible: l.responsible?.name ?? '—',
      }
    })
    .sort((a, b) => b.daysIdle - a.daysIdle)

  return { salesLeaderboard, recentInteractions, staleItems }
}

// ── Handler ────────────────────────────────────────────────────────────────────

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return unauthorized()

  try {
    const [clientRes, leadRes, interactionRes, conteudoRes] = await Promise.all([
      supabase
        .from('clientes')
        .select('id, name, status, contract_value, onboarding_date, contract_renewal_date')
        .order('onboarding_date', { ascending: true }),

      supabase
        .from('pipeline_leads')
        .select('id, company_name, stage, created_at, stage_entered_at, estimated_value, source, lost_reason, responsible, stale_after_days'),

      supabase
        .from('pipeline_lead_interactions')
        .select('id, kind, description, occurred_at, created_by, lead:pipeline_leads(company_name)')
        .order('occurred_at', { ascending: false })
        .limit(15),

      supabase
        .from('conteudo')
        .select('status'),
    ])

    if (clientRes.error) throw clientRes.error
    if (leadRes.error) throw leadRes.error

    const clients = (clientRes.data ?? []) as ClientRow[]
    const leads = (leadRes.data ?? []) as PipelineLeadRow[]
    // Supabase infere o tipo do join como array; cast via unknown para o shape esperado
    const interactions = ((interactionRes.data ?? []) as unknown) as InteractionRow[]
    const conteudoRows = (conteudoRes.data ?? []) as ConteudoRow[]

    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth()

    const revenueByMonth = buildRevenueData(clients, currentYear)
    const leadsByMonth = buildActiveLeadsByMonth(leads, currentYear)

    // Agrega status de conteúdo
    const contentStatusMap = new Map<string, number>()
    for (const row of conteudoRows) {
      contentStatusMap.set(row.status, (contentStatusMap.get(row.status) ?? 0) + 1)
    }
    const contentVolume = Array.from(contentStatusMap.entries()).map(([status, count]) => ({ status, count }))

    const payload: RelatoriosPayload = {
      overview:  buildOverviewData(clients, leads, revenueByMonth, leadsByMonth, currentMonth),
      sales:     buildSalesData(leads),
      cs:        buildCsData(clients, contentVolume),
      financial: buildFinancialData(clients),
      activity:  buildActivityData(leads, interactions),
    }

    return ok(payload)
  } catch (err) {
    console.error('[GET /api/relatorios]', err)
    return serverError()
  }
}
