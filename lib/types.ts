// Types for Connex CRM

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: "Admin" | "Gestor" | "Analista";
}

export type ClienteSource =
  | "indicacao"
  | "instagram"
  | "site"
  | "prospeccao"
  | "evento";
export type ServicoContratado =
  | "social_media"
  | "trafego_pago"
  | "branding"
  | "conteudo"
  | "design"
  | "seo";

export interface Client {
  id: string;
  name: string;
  logo?: string;
  segment: string;
  status: "Ativo" | "Lead" | "Inativo" | "Em risco";
  responsible: User;
  contractValue: number;
  lastActivity: Date;
  onboardingDate: Date;
  source: ClienteSource;
  sourceReferrer?: string;
  servicos: ServicoContratado[];
  contact: {
    email: string;
    phone: string;
    website?: string;
  };
  contractStartDate?: Date;
  contractRenewalDate?: Date;
  internalNotes?: string;
}

export type ClientContatoType =
  | "decisor"
  | "financeiro"
  | "operacional"
  | "outro";
export type ClientContatoChannel = "email" | "whatsapp" | "phone" | "outro";

export interface ClientContato {
  id: string;
  clienteId: string;
  name: string;
  role: string;
  email?: string;
  whatsapp?: string;
  preferredChannel?: ClientContatoChannel;
  type: ClientContatoType;
  createdAt: Date;
}

export type ClientArquivoType =
  | "contrato_assinado"
  | "briefing"
  | "proposta"
  | "outro";

export interface ClientArquivo {
  id: string;
  clienteId: string;
  name: string;
  filePath: string;
  fileType: ClientArquivoType;
  fileSize?: number;
  mimeType?: string;
  uploadedBy?: string;
  createdAt: Date;
  signedUrl?: string;
}

export interface Lead {
  id: string;
  companyName: string;
  contactName: string;
  contactAvatar: string;
  contractValue: number;
  daysInStage: number;
  responsible: User;
  priority: "high" | "medium" | "low";
  stage: FunnelStage;
  notes?: string;
}

export type FunnelStage =
  | "atracao"
  | "retencao"
  | "adesao"
  | "recompra"
  | "indicacao";

// ── Pipeline de vendas (Kanban comercial) ──────────────────────────────────────

export type PipelineStage =
  | "novo_lead"
  | "em_contato"
  | "reuniao_agendada"
  | "proposta_enviada"
  | "negociacao"
  | "fechado"
  | "perdido";

export type LeadSource =
  | "site"
  | "indicacao"
  | "instagram"
  | "prospeccao"
  | "evento";
export type LeadTemperature = "quente" | "morno" | "frio";
export type LeadInteractionKind =
  | "whatsapp"
  | "email"
  | "ligacao"
  | "reuniao"
  | "outro";

export interface LeadInteraction {
  id: string;
  leadId: string;
  kind: LeadInteractionKind;
  description: string;
  occurredAt: Date;
  createdBy?: string;
  createdAt: Date;
}

export interface PipelineLead {
  id: string;
  companyName: string;
  contactName: string;
  contactEmail?: string;
  contactPhone?: string;
  estimatedValue: number;
  stage: PipelineStage;
  responsible: User;
  lastContactAt?: Date;
  nextAction?: string;
  nextActionDate?: Date;
  meetingDate?: Date;
  lostReason?: string;
  source: LeadSource;
  sourceReferrer?: string;
  temperature: LeadTemperature;
  notes?: string;
  staleAfterDays: number;
  stageEnteredAt: Date;
  /** Computed: days elapsed since stageEnteredAt */
  daysInStage: number;
  /** Computed: true when daysInStage > staleAfterDays */
  isStale: boolean;
  /** Set when stage = fechado and the lead was converted to a client */
  clienteId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Campaign {
  id: string;
  name: string;
  client: Client;
  status: "Ativa" | "Pausada" | "Concluída" | "Rascunho";
  platforms: ("Meta Ads" | "Google Ads" | "Instagram" | "LinkedIn")[];
  budget: {
    spent: number;
    total: number;
  };
  metrics: {
    impressions: number;
    clicks: number;
    ctr: number;
    conversions: number;
  };
  responsible: User;
  startDate: Date;
  endDate: Date;
  objective: string;
  targetAudience?: string;
  thesis?: string;
}

export interface ContentItem {
  id: string;
  client: Client;
  platform: "Instagram" | "LinkedIn" | "YouTube" | "Blog";
  type: "Feed" | "Stories" | "Reels" | "Artigo";
  title: string;
  caption?: string;
  imageUrl?: string;
  publishDate: Date;
  status: "Rascunho" | "Aguardando aprovação" | "Aprovado" | "Publicado";
  responsible: User;
}

export type AtividadeTipo =
  | "reuniao"
  | "ligacao"
  | "email"
  | "mensagem"
  | "proposta"
  | "contrato";
export type AtividadeAssociacaoTipo = "cliente" | "lead";

export interface Atividade {
  id: string;
  tipo: AtividadeTipo;
  associacaoTipo: AtividadeAssociacaoTipo;
  associacaoId: string;
  associacaoNome: string;
  responsavel: User;
  responsavelId?: string;
  ocorridoEm: Date;
  descricao: string;
  resultado?: string;
  proximoPasso?: string;
  ownerId: string;
  createdAt: Date;
}

/** @deprecated Use Atividade — mantido para retrocompatibilidade */
export interface Activity {
  id: string;
  type: "novo_lead" | "reuniao" | "contrato" | "campanha";
  description: string;
  timestamp: Date;
  user: User;
  client?: Client;
}

export interface Task {
  id: string;
  title: string;
  dueDate: Date;
  assignee: User;
  completed: boolean;
  priority: "high" | "medium" | "low";
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  type: "info" | "success" | "warning" | "error";
}
