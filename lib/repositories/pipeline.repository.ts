import type { SupabaseClient } from '@supabase/supabase-js'
import type { PipelineLead, PipelineStage, LeadSource, User } from '@/lib/types'

// ── DB row shape (snake_case Postgres columns) ────────────────────────────────

interface PipelineLeadRow {
  id: string
  company_name: string
  contact_name: string
  contact_email: string | null
  contact_phone: string | null
  estimated_value: number
  stage: PipelineStage
  responsible: User
  last_contact_at: string | null
  next_action: string | null
  next_action_date: string | null
  meeting_date: string | null
  lost_reason: string | null
  source: LeadSource
  source_referrer: string | null
  temperature: PipelineLead['temperature']
  notes: string | null
  stale_after_days: number
  stage_entered_at: string
  cliente_id: string | null
  created_at: string
  updated_at: string
}

// ── Column mapping ─────────────────────────────────────────────────────────────

function rowToLead(row: PipelineLeadRow): PipelineLead {
  const stageEnteredAt = new Date(row.stage_entered_at)
  const daysInStage = Math.floor(
    (Date.now() - stageEnteredAt.getTime()) / (1000 * 60 * 60 * 24),
  )

  return {
    id: row.id,
    companyName: row.company_name,
    contactName: row.contact_name,
    contactEmail: row.contact_email ?? undefined,
    contactPhone: row.contact_phone ?? undefined,
    estimatedValue: Number(row.estimated_value),
    stage: row.stage,
    responsible: row.responsible,
    lastContactAt: row.last_contact_at ? new Date(row.last_contact_at) : undefined,
    nextAction: row.next_action ?? undefined,
    nextActionDate: row.next_action_date ? new Date(row.next_action_date) : undefined,
    meetingDate: row.meeting_date ? new Date(row.meeting_date) : undefined,
    lostReason: row.lost_reason ?? undefined,
    source: row.source,
    sourceReferrer: row.source_referrer ?? undefined,
    temperature: row.temperature,
    notes: row.notes ?? undefined,
    staleAfterDays: row.stale_after_days,
    stageEnteredAt,
    daysInStage,
    isStale: daysInStage > row.stale_after_days,
    clienteId: row.cliente_id ?? undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

// ── Query / mutation param types ───────────────────────────────────────────────

export type FindManyPipelineParams = {
  page: number
  limit: number
  stage?: PipelineStage
  responsibleId?: string
  search?: string
}

export type InsertPipelineInput = {
  companyName: string
  contactName: string
  contactEmail?: string
  contactPhone?: string
  estimatedValue: number
  stage: PipelineStage
  responsible: User
  lastContactAt?: Date
  nextAction?: string
  nextActionDate?: Date
  meetingDate?: Date
  source: LeadSource
  sourceReferrer?: string
  temperature: PipelineLead['temperature']
  notes?: string
  staleAfterDays: number
}

export type UpdatePipelineInput = Partial<{
  companyName: string
  contactName: string
  contactEmail: string | null
  contactPhone: string | null
  estimatedValue: number
  stage: PipelineStage
  responsible: User
  lastContactAt: Date | null
  nextAction: string | null
  nextActionDate: Date | null
  meetingDate: Date | null
  lostReason: string | null
  source: LeadSource
  sourceReferrer: string | null
  temperature: PipelineLead['temperature']
  notes: string | null
  staleAfterDays: number
  stageEnteredAt: Date
  clienteId: string | null
}>

// ── Repository ─────────────────────────────────────────────────────────────────

export const PipelineRepository = {
  async findMany(
    supabase: SupabaseClient,
    { page, limit, stage, responsibleId, search }: FindManyPipelineParams,
  ) {
    let query = supabase
      .from('pipeline_leads')
      .select('*', { count: 'exact' })
      .order('stage_entered_at', { ascending: false })

    if (stage) query = query.eq('stage', stage)
    if (search) {
      query = query.or(
        `company_name.ilike.%${search}%,contact_name.ilike.%${search}%`,
      )
    }
    if (responsibleId) {
      query = query.contains('responsible', { id: responsibleId })
    }

    const from = (page - 1) * limit
    const { data, error, count } = await query.range(from, from + limit - 1)

    if (error) throw error

    return {
      items: (data as PipelineLeadRow[]).map(rowToLead),
      total: count ?? 0,
      page,
      limit,
    }
  },

  async findById(supabase: SupabaseClient, id: string): Promise<PipelineLead> {
    const { data, error } = await supabase
      .from('pipeline_leads')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return rowToLead(data as PipelineLeadRow)
  },

  async insert(
    supabase: SupabaseClient,
    input: InsertPipelineInput,
  ): Promise<PipelineLead> {
    const row = {
      company_name: input.companyName,
      contact_name: input.contactName,
      contact_email: input.contactEmail ?? null,
      contact_phone: input.contactPhone ?? null,
      estimated_value: input.estimatedValue,
      stage: input.stage,
      responsible: input.responsible,
      last_contact_at: input.lastContactAt?.toISOString() ?? null,
      next_action: input.nextAction ?? null,
      next_action_date: input.nextActionDate
        ? input.nextActionDate.toISOString().split('T')[0]
        : null,
      meeting_date: input.meetingDate
        ? input.meetingDate.toISOString().split('T')[0]
        : null,
      source: input.source,
      source_referrer: input.sourceReferrer ?? null,
      temperature: input.temperature,
      notes: input.notes ?? null,
      stale_after_days: input.staleAfterDays,
      stage_entered_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('pipeline_leads')
      .insert(row)
      .select()
      .single()

    if (error) throw error
    return rowToLead(data as PipelineLeadRow)
  },

  async update(
    supabase: SupabaseClient,
    id: string,
    input: UpdatePipelineInput,
  ): Promise<PipelineLead> {
    const patch: Record<string, unknown> = {}

    if (input.companyName !== undefined) patch.company_name = input.companyName
    if (input.contactName !== undefined) patch.contact_name = input.contactName
    if (input.contactEmail !== undefined) patch.contact_email = input.contactEmail
    if (input.contactPhone !== undefined) patch.contact_phone = input.contactPhone
    if (input.estimatedValue !== undefined) patch.estimated_value = input.estimatedValue
    if (input.stage !== undefined) patch.stage = input.stage
    if (input.responsible !== undefined) patch.responsible = input.responsible
    if (input.lastContactAt !== undefined) {
      patch.last_contact_at = input.lastContactAt?.toISOString() ?? null
    }
    if (input.nextAction !== undefined) patch.next_action = input.nextAction
    if (input.nextActionDate !== undefined) {
      patch.next_action_date = input.nextActionDate
        ? input.nextActionDate.toISOString().split('T')[0]
        : null
    }
    if (input.meetingDate !== undefined) {
      patch.meeting_date = input.meetingDate
        ? input.meetingDate.toISOString().split('T')[0]
        : null
    }
    if (input.lostReason !== undefined) patch.lost_reason = input.lostReason
    if (input.source !== undefined) patch.source = input.source
    if (input.sourceReferrer !== undefined) patch.source_referrer = input.sourceReferrer
    if (input.temperature !== undefined) patch.temperature = input.temperature
    if (input.notes !== undefined) patch.notes = input.notes
    if (input.staleAfterDays !== undefined) patch.stale_after_days = input.staleAfterDays
    if (input.stageEnteredAt !== undefined) {
      patch.stage_entered_at = input.stageEnteredAt.toISOString()
    }
    if (input.clienteId !== undefined) patch.cliente_id = input.clienteId

    const { data, error } = await supabase
      .from('pipeline_leads')
      .update(patch)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return rowToLead(data as PipelineLeadRow)
  },

  async delete(supabase: SupabaseClient, id: string): Promise<void> {
    const { error } = await supabase.from('pipeline_leads').delete().eq('id', id)
    if (error) throw error
  },
}
