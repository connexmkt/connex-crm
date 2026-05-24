/**
 * GET /api/relatorios
 *
 * Retorna todos os dados necessários para a página de Relatórios:
 *   - kpiData          — métricas de investimento/leads (canais simulados até tabela existir)
 *   - clientGrowthData — crescimento de clientes ativos mês a mês (dados reais do Supabase)
 *   - channelData      — performance por canal (simulado até tabela de campanhas existir)
 *   - funnelData       — distribuição do funil por etapa (simulado até tabela de leads existir)
 *   - revenueData      — faturamento mensal derivado dos contratos ativos (dados reais do Supabase)
 *   - clientReports    — lista de clientes com métricas de campanha (clientes reais; métricas simuladas)
 *
 * Response 200: { data: RelatoriosPayload }
 * Response 401: Unauthorized
 * Response 500: Internal Server Error
 */

import { createClient } from '@/lib/server'
import { ok, unauthorized, serverError } from '@/lib/api/response'
import type { Client, PipelineStage } from '@/lib/types'

// ── Tipos do payload ───────────────────────────────────────────────────────────

export type KpiData = {
  totalInvestido: number
  totalLeads: number
  totalConversoes: number
  cpl: number
  taxaConversao: number
  investidoVariacao: number
  leadsVariacao: number
  cplVariacao: number
  taxaConversaoVariacao: number
}

export type ClientGrowthItem = { month: string; leads: number }
export type ChannelItem = { channel: string; leads: number; conversions: number; cost: number }
export type FunnelItem = { name: string; value: number }
export type RevenueItem = { month: string; value: number }

export type ClientReportItem = {
  id: string
  name: string
  status: Client['status']
  activeCampaign: string | null
  leads: number
  convRate: number
  roi: number
}

export type RelatoriosPayload = {
  kpiData: KpiData
  clientGrowthData: ClientGrowthItem[]
  channelData: ChannelItem[]
  funnelData: FunnelItem[]
  revenueData: RevenueItem[]
  clientReports: ClientReportItem[]
}

// ── DB row shape ───────────────────────────────────────────────────────────────

interface ClientRow {
  id: string
  name: string
  segment: string
  status: Client['status']
  contract_value: number
  onboarding_date: string
}

interface PipelineLeadRow {
  id: string
  stage: PipelineStage
  created_at: string
  stage_entered_at: string | null
}

// ── Dados simulados (substituir quando as tabelas de campanhas/leads existirem) ──

const CHANNEL_DATA: ChannelItem[] = [
  { channel: 'Meta Ads',    leads: 45, conversions: 12, cost: 15000 },
  { channel: 'Google Ads',  leads: 38, conversions: 10, cost: 12000 },
  { channel: 'Orgânico',    leads: 25, conversions: 8,  cost: 0 },
  { channel: 'Indicação',   leads: 15, conversions: 6,  cost: 0 },
]

const FUNNEL_DATA: FunnelItem[] = [
  { name: 'Atração',   value: 12 },
  { name: 'Retenção',  value: 8 },
  { name: 'Adesão',    value: 5 },
  { name: 'Recompra',  value: 3 },
  { name: 'Indicação', value: 2 },
]

const MONTHS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Snapshot no fim de cada mês do ano corrente.
 * Lead conta se created_at <= fimDoMes e, naquele instante, não estava em fechado/perdido.
 */
function buildActiveLeadsByMonth(leads: PipelineLeadRow[], year: number): ClientGrowthItem[] {
  return MONTHS_PT.map((month, m) => {
    const endOfMonth = new Date(year, m + 1, 0, 23, 59, 59)
    
    const activeLeads = leads.filter((lead) => {
      const createdAt = new Date(lead.created_at)
      if (createdAt > endOfMonth) return false

      const isTerminal = lead.stage === 'fechado' || lead.stage === 'perdido'
      if (!isTerminal) return true

      // Se hoje está terminal, verificar se já estava terminal no fim daquele mês
      if (!lead.stage_entered_at) return false // Se não tem data, assume que já era terminal
      const stageEnteredAt = new Date(lead.stage_entered_at)
      return stageEnteredAt > endOfMonth
    })

    return { month, leads: activeLeads.length }
  })
}

/**
 * Soma de contract_value dos clientes com status 'Ativo' no fim de cada mês.
 */
function buildRevenueData(rows: ClientRow[], year: number): RevenueItem[] {
  return MONTHS_PT.map((month, m) => {
    const endOfMonth = new Date(year, m + 1, 0, 23, 59, 59)
    
    const activeRevenue = rows
      .filter((r) => {
        const onboardingDate = new Date(r.onboarding_date)
        return r.status === 'Ativo' && onboardingDate <= endOfMonth
      })
      .reduce((sum, r) => sum + (r.contract_value || 0), 0)

    return { month, value: activeRevenue }
  })
}

// ── Handler ────────────────────────────────────────────────────────────────────

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return unauthorized()

  try {
    // 1. Buscar clientes
    const { data: clientRows, error: clientError } = await supabase
      .from('clientes')
      .select('id, name, segment, status, contract_value, onboarding_date')
      .order('onboarding_date', { ascending: true })

    if (clientError) throw clientError

    // 2. Buscar leads do pipeline para o gráfico de crescimento
    const { data: leadRows, error: leadError } = await supabase
      .from('pipeline_leads')
      .select('id, stage, created_at, stage_entered_at')

    if (leadError) throw leadError

    const clients = (clientRows ?? []) as ClientRow[]
    const leads = (leadRows ?? []) as PipelineLeadRow[]
    const now = new Date()
    const currentYear = now.getFullYear()

    // KPIs derivados dos canais
    const totalInvestido = CHANNEL_DATA.reduce((s, c) => s + c.cost, 0)
    const totalLeads = CHANNEL_DATA.reduce((s, c) => s + c.leads, 0)
    const totalConversoes = CHANNEL_DATA.reduce((s, c) => s + c.conversions, 0)
    const cpl = totalLeads > 0 ? totalInvestido / totalLeads : 0
    const taxaConversao = totalLeads > 0 ? (totalConversoes / totalLeads) * 100 : 0

    const kpiData: KpiData = {
      totalInvestido,
      totalLeads,
      totalConversoes,
      cpl,
      taxaConversao,
      investidoVariacao: 12.5,
      leadsVariacao: 8.3,
      cplVariacao: -5.2,
      taxaConversaoVariacao: 2.1,
    }

    // Relatório por cliente — feature futura
    const clientReports: ClientReportItem[] = []

    const payload: RelatoriosPayload = {
      kpiData,
      clientGrowthData: buildActiveLeadsByMonth(leads, currentYear),
      channelData: CHANNEL_DATA,
      funnelData: FUNNEL_DATA,
      revenueData: buildRevenueData(clients, currentYear),
      clientReports,
    }

    return ok(payload)
  } catch (err) {
    console.error('[GET /api/relatorios]', err)
    return serverError()
  }
}
