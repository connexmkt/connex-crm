// Types for Connex CRM

export interface User {
  id: string
  name: string
  email: string
  avatar: string
  role: 'Admin' | 'Gestor' | 'Analista'
}

export interface Client {
  id: string
  name: string
  logo?: string
  segment: string
  status: 'Ativo' | 'Lead' | 'Inativo' | 'Em risco'
  responsible: User
  contractValue: number
  lastActivity: Date
  onboardingDate: Date
  plan: string
  contact: {
    email: string
    phone: string
    website?: string
  }
  contractStartDate?: Date
  contractRenewalDate?: Date
  internalNotes?: string
}

export type ClientContatoType = 'decisor' | 'financeiro' | 'operacional' | 'outro'
export type ClientContatoChannel = 'email' | 'whatsapp' | 'phone' | 'outro'

export interface ClientContato {
  id: string
  clienteId: string
  name: string
  role: string
  email?: string
  whatsapp?: string
  preferredChannel?: ClientContatoChannel
  type: ClientContatoType
  createdAt: Date
}

export type ClientArquivoType = 'contrato_assinado' | 'briefing' | 'proposta' | 'outro'

export interface ClientArquivo {
  id: string
  clienteId: string
  name: string
  filePath: string
  fileType: ClientArquivoType
  fileSize?: number
  mimeType?: string
  uploadedBy?: string
  createdAt: Date
  signedUrl?: string
}

export interface Lead {
  id: string
  companyName: string
  contactName: string
  contactAvatar: string
  contractValue: number
  daysInStage: number
  responsible: User
  priority: 'high' | 'medium' | 'low'
  stage: FunnelStage
  notes?: string
}

export type FunnelStage = 'atracao' | 'retencao' | 'adesao' | 'recompra' | 'indicacao'

export interface Campaign {
  id: string
  name: string
  client: Client
  status: 'Ativa' | 'Pausada' | 'Concluída' | 'Rascunho'
  platforms: ('Meta Ads' | 'Google Ads' | 'Instagram' | 'LinkedIn')[]
  budget: {
    spent: number
    total: number
  }
  metrics: {
    impressions: number
    clicks: number
    ctr: number
    conversions: number
  }
  responsible: User
  startDate: Date
  endDate: Date
  objective: string
  targetAudience?: string
  thesis?: string
}

export interface ContentItem {
  id: string
  client: Client
  platform: 'Instagram' | 'LinkedIn' | 'YouTube' | 'Blog'
  type: 'Feed' | 'Stories' | 'Reels' | 'Artigo'
  title: string
  caption?: string
  imageUrl?: string
  publishDate: Date
  status: 'Rascunho' | 'Aguardando aprovação' | 'Aprovado' | 'Publicado'
  responsible: User
}

export interface Activity {
  id: string
  type: 'novo_lead' | 'reuniao' | 'contrato' | 'campanha'
  description: string
  timestamp: Date
  user: User
  client?: Client
}

export interface Task {
  id: string
  title: string
  dueDate: Date
  assignee: User
  completed: boolean
  priority: 'high' | 'medium' | 'low'
}

export interface Notification {
  id: string
  title: string
  message: string
  timestamp: Date
  read: boolean
  type: 'info' | 'success' | 'warning' | 'error'
}
