import type { SupabaseClient } from '@supabase/supabase-js'
import { LeadInteractionsRepository, type InsertInteractionInput } from '@/lib/repositories/lead-interactions.repository'
import type { LeadInteraction, LeadInteractionKind } from '@/lib/types'

export type CreateInteractionInput = {
  leadId: string
  kind: LeadInteractionKind
  description: string
  occurredAt?: string
}

export const LeadInteractionsService = {
  async listByLead(supabase: SupabaseClient, leadId: string): Promise<LeadInteraction[]> {
    return LeadInteractionsRepository.findByLead(supabase, leadId)
  },

  async create(supabase: SupabaseClient, input: CreateInteractionInput): Promise<LeadInteraction> {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) throw new Error('Unauthenticated')

    const insertInput: InsertInteractionInput = {
      leadId: input.leadId,
      kind: input.kind,
      description: input.description,
      occurredAt: input.occurredAt ? new Date(input.occurredAt) : new Date(),
      createdBy: user.id,
    }

    return LeadInteractionsRepository.insert(supabase, insertInput)
  },

  async delete(supabase: SupabaseClient, id: string): Promise<void> {
    return LeadInteractionsRepository.delete(supabase, id)
  },
}
