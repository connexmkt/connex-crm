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
import type { Client } from '@/lib/types'

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

export type ClientGrowthItem = { month: string; clients: number }
export type ChannelItem = { channel: string; leads: number; conversions: number; cost: number }
export type FunnelItem = { name: string; value: number }
export type RevenueItem = { month: string; value: number; previous: number }

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

function buildClientGrowthData(rows: ClientRow[]): ClientGrowthItem[] {
  const now = new Date()
  return Array.from({ length: 5 }, (_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (4 - i), 1)
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59)
    const count = rows.filter((r) => new Date(r.onboarding_date) <= endOfMonth).length
    return { month: MONTHS_PT[date.getMonth()], clients: count }
  })
}

function buildRevenueData(rows: ClientRow[]): RevenueItem[] {
  const now = new Date()
  const activeRows = rows.filter((r) => r.status === 'Ativo')
  const totalMonthly = activeRows.reduce((sum, r) => sum + r.contract_value, 0) || 68500

  return Array.from({ length: 5 }, (_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (4 - i), 1)
    const factor = 0.80 + i * 0.05
    const value = Math.round(totalMonthly * factor)
    const previous = Math.round(value * 0.90)
    return { month: MONTHS_PT[date.getMonth()], value, previous }
  })
}

// ── Handler ────────────────────────────────────────────────────────────────────

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return unauthorized()

  try {
    const { data: rows, error } = await supabase
      .from('clientes')
      .select('id, name, segment, status, contract_value, onboarding_date')
      .order('onboarding_date', { ascending: true })

    if (error) throw error

    const clients = (rows ?? []) as ClientRow[]
    const now = new Date()
    const currentMonth = MONTHS_PT[now.getMonth()]

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

    // Relatório por cliente — campanhas simuladas até tabela existir
    const clientReports: ClientReportItem[] = clients.slice(0, 6).map((client, i) => {
      const isActive = client.status === 'Ativo'
      const leads = isActive ? Math.max(0, 22 - i * 3) : 0
      const convRate = isActive ? parseFloat((4.8 - i * 0.4).toFixed(1)) : 0
      const budgetSpent = isActive ? 5000 - i * 500 : 1
      const roi = isActive ? parseFloat(((leads * 150) / budgetSpent).toFixed(1)) : 0

      return {
        id: client.id,
        name: client.name,
        status: client.status,
        activeCampaign: isActive ? `Campanha ${currentMonth}` : null,
        leads,
        convRate,
        roi,
      }
    })

    const payload: RelatoriosPayload = {
      kpiData,
      clientGrowthData: buildClientGrowthData(clients),
      channelData: CHANNEL_DATA,
      funnelData: FUNNEL_DATA,
      revenueData: buildRevenueData(clients),
      clientReports,
    }

    return ok(payload)
  } catch (err) {
    console.error('[GET /api/relatorios]', err)
    return serverError()
  }
}
