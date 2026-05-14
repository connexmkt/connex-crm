import type { SupabaseClient } from '@supabase/supabase-js'
import {
  ClientesRepository,
  type FindManyParams,
  type InsertInput,
  type UpdateInput,
} from '@/lib/repositories/clientes.repository'
import type { Client } from '@/lib/types'

export type CreateClienteInput = {
  name: string
  logo?: string
  segment: string
  status: Client['status']
  plan: string
  contractValue: number
  responsibleId: string
  contact: {
    email: string
    phone: string
    website?: string
  }
}

export type UpdateClienteInput = {
  name?: string
  logo?: string
  segment?: string
  status?: Client['status']
  plan?: string
  contractValue?: number
  contact?: {
    email: string
    phone: string
    website?: string
  }
}

export const ClientesService = {
  async list(supabase: SupabaseClient, params: FindManyParams) {
    return ClientesRepository.findMany(supabase, params)
  },

  async getById(supabase: SupabaseClient, id: string) {
    return ClientesRepository.findById(supabase, id)
  },

  async create(supabase: SupabaseClient, input: CreateClienteInput) {
    // Resolve the responsible user from the authenticated session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) throw new Error('Unauthenticated')

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, name, email, avatar, role')
      .eq('id', input.responsibleId || user.id)
      .single()

    if (profileError || !profile) {
      throw new Error('Responsible user not found')
    }

    const insertPayload: InsertInput = {
      name: input.name,
      logo: input.logo,
      segment: input.segment,
      status: input.status,
      responsible: {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        avatar: profile.avatar ?? '',
        role: profile.role,
      },
      contractValue: input.contractValue,
      plan: input.plan,
      contact: input.contact,
      onboardingDate: new Date(),
      lastActivity: new Date(),
    }

    return ClientesRepository.insert(supabase, insertPayload)
  },

  async update(supabase: SupabaseClient, id: string, input: UpdateClienteInput) {
    // Verify the client exists before updating
    await ClientesRepository.findById(supabase, id)

    const updatePayload: UpdateInput = {}

    if (input.name !== undefined) updatePayload.name = input.name
    if (input.logo !== undefined) updatePayload.logo = input.logo
    if (input.segment !== undefined) updatePayload.segment = input.segment
    if (input.status !== undefined) updatePayload.status = input.status
    if (input.plan !== undefined) updatePayload.plan = input.plan
    if (input.contractValue !== undefined) updatePayload.contractValue = input.contractValue
    if (input.contact !== undefined) updatePayload.contact = input.contact

    updatePayload.lastActivity = new Date()

    return ClientesRepository.update(supabase, id, updatePayload)
  },

  async delete(supabase: SupabaseClient, id: string) {
    // Verify the client exists before deleting
    await ClientesRepository.findById(supabase, id)
    return ClientesRepository.delete(supabase, id)
  },
}
