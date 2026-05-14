/**
 * GET /api/notifications
 *
 * Retorna as notificações do usuário autenticado.
 * Dados simulados até a tabela `notifications` existir no Supabase.
 *
 * Response 200: { data: Notification[] }
 * Response 401: Unauthorized
 * Response 500: Internal Server Error
 */

import { createClient } from '@/lib/server'
import { ok, unauthorized, serverError } from '@/lib/api/response'
import type { Notification } from '@/lib/types'

const now = Date.now()

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'n1',
    title: 'Novo lead',
    message: 'Startup X foi adicionado ao pipeline',
    timestamp: new Date(now - 30 * 60_000),
    read: false,
    type: 'info',
  },
  {
    id: 'n2',
    title: 'Meta atingida!',
    message: 'Campanha Dia das Mães superou as conversões esperadas',
    timestamp: new Date(now - 2 * 3_600_000),
    read: false,
    type: 'success',
  },
  {
    id: 'n3',
    title: 'Cliente em risco',
    message: 'Fitness Prime sem atividade há 20 dias',
    timestamp: new Date(now - 24 * 3_600_000),
    read: true,
    type: 'warning',
  },
  {
    id: 'n4',
    title: 'Orçamento esgotando',
    message: 'Campanha Google Ads utilizou 90% do orçamento',
    timestamp: new Date(now - 2 * 86_400_000),
    read: true,
    type: 'warning',
  },
  {
    id: 'n5',
    title: 'Contrato renovado',
    message: 'TechStore Brasil renovou por mais 12 meses',
    timestamp: new Date(now - 3 * 86_400_000),
    read: true,
    type: 'success',
  },
]

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return unauthorized()

  try {
    return ok(MOCK_NOTIFICATIONS)
  } catch (err) {
    console.error('[GET /api/notifications]', err)
    return serverError()
  }
}
