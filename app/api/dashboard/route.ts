/**
 * GET /api/dashboard
 *
 * Retorna todos os dados necessários para o Dashboard:
 *   - kpiData     — métricas agregadas (clientes reais do Supabase; leads/campanhas/faturamento simulados)
 *   - pipelineChartData — distribuição do funil (simulado até tabela de leads existir)
 *   - activities  — atividades recentes (simulado)
 *   - tasks       — próximas tarefas (simulado)
 *   - atRiskClients — clientes com status "Em risco" (dados reais do Supabase)
 *
 * Response 200: { data: DashboardPayload }
 * Response 401: Unauthorized
 * Response 500: Internal Server Error
 */

import { createClient } from '@/lib/server'
import { ok, unauthorized, serverError } from '@/lib/api/response'
import type { Activity, Task, Client, User } from '@/lib/types'

// ── Tipos do payload ───────────────────────────────────────────────────────────

type KpiData = {
  totalClientes: number
  clientesVariacao: number
  leadsNoPipeline: number
  leadsVariacao: number
  campanhasAtivas: number
  campanhasVariacao: number
  faturamentoMes: number
  faturamentoVariacao: number
}

type PipelineChartItem = {
  stage: string
  count: number
  color: string
}

export type DashboardPayload = {
  kpiData: KpiData
  pipelineChartData: PipelineChartItem[]
  activities: Activity[]
  tasks: Task[]
  atRiskClients: Client[]
}

// ── Dados simulados (substituir quando as tabelas existirem) ──────────────────

const PLACEHOLDER_USER: User = {
  id: 'u0',
  name: 'Ana Lima',
  email: 'ana@connex.io',
  avatar: '',
  role: 'Admin',
}

const now = Date.now()

const MOCK_ACTIVITIES: Activity[] = [
  {
    id: 'act-1',
    type: 'novo_lead',
    description: 'Novo lead cadastrado: Tech Solutions Ltda',
    timestamp: new Date(now - 1 * 3_600_000),
    user: { ...PLACEHOLDER_USER, name: 'Carlos Menezes' },
  },
  {
    id: 'act-2',
    type: 'reuniao',
    description: 'Reunião de alinhamento com Grupo Alfa agendada',
    timestamp: new Date(now - 3 * 3_600_000),
    user: PLACEHOLDER_USER,
  },
  {
    id: 'act-3',
    type: 'contrato',
    description: 'Contrato assinado com Novara Digital',
    timestamp: new Date(now - 1 * 86_400_000),
    user: { ...PLACEHOLDER_USER, name: 'Julia Ramos' },
  },
  {
    id: 'act-4',
    type: 'campanha',
    description: 'Nova campanha criada: Verão 2025 – Meta Ads',
    timestamp: new Date(now - 2 * 86_400_000),
    user: { ...PLACEHOLDER_USER, name: 'Pedro Souza' },
  },
  {
    id: 'act-5',
    type: 'novo_lead',
    description: 'Novo lead qualificado: Agência Vortex',
    timestamp: new Date(now - 3 * 86_400_000),
    user: PLACEHOLDER_USER,
  },
]

const MOCK_TASKS: Task[] = [
  {
    id: 'task-1',
    title: 'Revisar proposta para Novara Digital',
    dueDate: new Date(now + 1 * 86_400_000),
    assignee: PLACEHOLDER_USER,
    completed: false,
    priority: 'high',
  },
  {
    id: 'task-2',
    title: 'Enviar relatório mensal – Grupo Alfa',
    dueDate: new Date(now + 2 * 86_400_000),
    assignee: { ...PLACEHOLDER_USER, name: 'Carlos Menezes' },
    completed: false,
    priority: 'medium',
  },
  {
    id: 'task-3',
    title: 'Agendar call de onboarding',
    dueDate: new Date(now + 4 * 86_400_000),
    assignee: { ...PLACEHOLDER_USER, name: 'Julia Ramos' },
    completed: false,
    priority: 'low',
  },
  {
    id: 'task-4',
    title: 'Atualizar briefing de campanha Google Ads',
    dueDate: new Date(now + 5 * 86_400_000),
    assignee: { ...PLACEHOLDER_USER, name: 'Pedro Souza' },
    completed: false,
    priority: 'medium',
  },
]

const MOCK_PIPELINE: PipelineChartItem[] = [
  { stage: 'Atração',   count: 12, color: '#5B5FE8' },
  { stage: 'Retenção',  count: 8,  color: '#7C7FEE' },
  { stage: 'Adesão',    count: 5,  color: '#9DA0F4' },
  { stage: 'Recompra',  count: 3,  color: '#BEC0FA' },
  { stage: 'Indicação', count: 2,  color: '#DFDFF9' },
]

// ── DB row shape ───────────────────────────────────────────────────────────────

interface ClientRow {
  id: string
  name: string
  logo: string | null
  segment: string
  status: Client['status']
  responsible: User
  contract_value: number
  last_activity: string
  onboarding_date: string
  plan: string
  contact: { email: string; phone: string; website?: string }
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
    plan: row.plan,
    contact: row.contact,
  }
}

// ── Handler ────────────────────────────────────────────────────────────────────

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return unauthorized()

  try {
    const { data: rows, error } = await supabase
      .from('clientes')
      .select('id, name, logo, segment, status, responsible, contract_value, last_activity, onboarding_date, plan, contact')

    if (error) throw error

    const clients = ((rows ?? []) as ClientRow[]).map(rowToClient)

    const ativos = clients.filter((c) => c.status === 'Ativo')
    const atRiskClients = clients.filter((c) => c.status === 'Em risco')

    const totalClientes = ativos.length
    const faturamentoMes = ativos.reduce((sum, c) => sum + c.contractValue, 0)

    const kpiData: KpiData = {
      totalClientes,
      clientesVariacao: 8.3,
      leadsNoPipeline: MOCK_PIPELINE.reduce((s, p) => s + p.count, 0),
      leadsVariacao: 12.5,
      campanhasAtivas: 7,
      campanhasVariacao: -2.1,
      faturamentoMes: faturamentoMes || 87_500,
      faturamentoVariacao: 5.7,
    }

    const payload: DashboardPayload = {
      kpiData,
      pipelineChartData: MOCK_PIPELINE,
      activities: MOCK_ACTIVITIES,
      tasks: MOCK_TASKS,
      atRiskClients,
    }

    return ok(payload)
  } catch (err) {
    console.error('[GET /api/dashboard]', err)
    return serverError()
  }
}
