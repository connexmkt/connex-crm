/**
 * GET /api/leads
 *
 * Retorna todos os leads do pipeline.
 * Dados simulados no servidor até a tabela `leads` existir no Supabase.
 *
 * Response 200: { data: Lead[] }
 * Response 401: Unauthorized
 * Response 500: Internal Server Error
 */

import { createClient } from '@/lib/server'
import { ok, unauthorized, serverError } from '@/lib/api/response'
import type { Lead } from '@/lib/types'

const MOCK_LEADS: Lead[] = [
  {
    id: 'lead-1',
    companyName: 'Tech Solutions Ltda',
    contactName: 'Carlos Menezes',
    contactAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Carlos',
    contractValue: 12000,
    daysInStage: 5,
    responsible: {
      id: 'u1',
      name: 'Lucas Oliveira',
      email: 'lucas@connex.com.br',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lucas',
      role: 'Admin',
    },
    priority: 'high',
    stage: 'atracao',
    notes: 'Empresa de tecnologia com foco em automação industrial.',
  },
  {
    id: 'lead-2',
    companyName: 'Grupo Alfa Varejo',
    contactName: 'Fernanda Lima',
    contactAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Fernanda',
    contractValue: 8500,
    daysInStage: 12,
    responsible: {
      id: 'u2',
      name: 'Marina Santos',
      email: 'marina@connex.com.br',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Marina',
      role: 'Gestor',
    },
    priority: 'medium',
    stage: 'atracao',
  },
  {
    id: 'lead-3',
    companyName: 'Novara Digital',
    contactName: 'Roberto Alves',
    contactAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Roberto',
    contractValue: 22000,
    daysInStage: 3,
    responsible: {
      id: 'u1',
      name: 'Lucas Oliveira',
      email: 'lucas@connex.com.br',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lucas',
      role: 'Admin',
    },
    priority: 'high',
    stage: 'retencao',
    notes: 'Interesse em pacote full-service com gestão de tráfego e conteúdo.',
  },
  {
    id: 'lead-4',
    companyName: 'Agência Vortex',
    contactName: 'Patrícia Rocha',
    contactAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Patricia',
    contractValue: 6000,
    daysInStage: 8,
    responsible: {
      id: 'u3',
      name: 'Rafael Costa',
      email: 'rafael@connex.com.br',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rafael',
      role: 'Analista',
    },
    priority: 'low',
    stage: 'retencao',
  },
  {
    id: 'lead-5',
    companyName: 'Inova Saúde',
    contactName: 'Dr. Marcos Vieira',
    contactAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Marcos',
    contractValue: 18500,
    daysInStage: 2,
    responsible: {
      id: 'u2',
      name: 'Marina Santos',
      email: 'marina@connex.com.br',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Marina',
      role: 'Gestor',
    },
    priority: 'high',
    stage: 'adesao',
    notes: 'Clínica de saúde integrativa buscando ampliar presença digital.',
  },
  {
    id: 'lead-6',
    companyName: 'Construtora Horizonte',
    contactName: 'André Figueiredo',
    contactAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Andre',
    contractValue: 9000,
    daysInStage: 20,
    responsible: {
      id: 'u4',
      name: 'Juliana Ferreira',
      email: 'juliana@connex.com.br',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Juliana',
      role: 'Gestor',
    },
    priority: 'medium',
    stage: 'adesao',
  },
  {
    id: 'lead-7',
    companyName: 'Prime Foods',
    contactName: 'Luciana Torres',
    contactAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Luciana',
    contractValue: 14000,
    daysInStage: 6,
    responsible: {
      id: 'u3',
      name: 'Rafael Costa',
      email: 'rafael@connex.com.br',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rafael',
      role: 'Analista',
    },
    priority: 'medium',
    stage: 'recompra',
    notes: 'Cliente satisfeito, conversando sobre renovação com upgrade de plano.',
  },
  {
    id: 'lead-8',
    companyName: 'StartHub Ventures',
    contactName: 'Diego Neves',
    contactAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Diego',
    contractValue: 31000,
    daysInStage: 1,
    responsible: {
      id: 'u1',
      name: 'Lucas Oliveira',
      email: 'lucas@connex.com.br',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lucas',
      role: 'Admin',
    },
    priority: 'high',
    stage: 'indicacao',
    notes: 'Indicado pela Novara Digital. Alto potencial de fechamento.',
  },
]

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return unauthorized()

  try {
    return ok(MOCK_LEADS)
  } catch (err) {
    console.error('[GET /api/leads]', err)
    return serverError()
  }
}
