import type { SupabaseClient } from '@supabase/supabase-js'
import type { LeadInteraction, LeadInteractionKind } from '@/lib/types'

// ── DB row shape (snake_case Postgres columns) ────────────────────────────────

interface LeadInteractionRow {
  id: string
  lead_id: string
  kind: LeadInteractionKind
  description: string
  occurred_at: string
  created_by: string | null
  created_at: string
}

// ── Column mapping ─────────────────────────────────────────────────────────────

function rowToInteraction(row: LeadInteractionRow): LeadInteraction {
  return {
    id: row.id,
    leadId: row.lead_id,
    kind: row.kind,
    description: row.description,
    occurredAt: new Date(row.occurred_at),
    createdBy: row.created_by ?? undefined,
    createdAt: new Date(row.created_at),
  }
}

// ── Repository ─────────────────────────────────────────────────────────────────

export type InsertInteractionInput = Omit<LeadInteraction, 'id' | 'createdAt'>

export const LeadInteractionsRepository = {
  async findByLead(supabase: SupabaseClient, leadId: string): Promise<LeadInteraction[]> {
    const { data, error } = await supabase
      .from('pipeline_lead_interactions')
      .select('*')
      .eq('lead_id', leadId)
      .order('occurred_at', { ascending: false })

    if (error) throw error
    return (data as LeadInteractionRow[]).map(rowToInteraction)
  },

  async insert(supabase: SupabaseClient, input: InsertInteractionInput): Promise<LeadInteraction> {
    const row = {
      lead_id: input.leadId,
      kind: input.kind,
      description: input.description,
      occurred_at: input.occurredAt.toISOString(),
      created_by: input.createdBy ?? null,
    }

    const { data, error } = await supabase
      .from('pipeline_lead_interactions')
      .insert(row)
      .select()
      .single()

    if (error) throw error
    return rowToInteraction(data as LeadInteractionRow)
  },

  async delete(supabase: SupabaseClient, id: string): Promise<void> {
    const { error } = await supabase
      .from('pipeline_lead_interactions')
      .delete()
      .eq('id', id)

    if (error) throw error
  },
}
