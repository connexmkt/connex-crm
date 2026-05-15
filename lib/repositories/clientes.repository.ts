import type { SupabaseClient } from '@supabase/supabase-js'
import type { Client, User } from '@/lib/types'

// ── DB row shape (snake_case Postgres columns) ──────────────────────────────

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
  contact: {
    email: string
    phone: string
    website?: string
  }
  contract_start_date: string | null
  contract_renewal_date: string | null
  internal_notes: string | null
  created_at: string
}

// ── Column mapping helpers ────────────────────────────────────────────────────

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
    contractStartDate: row.contract_start_date ? new Date(row.contract_start_date) : undefined,
    contractRenewalDate: row.contract_renewal_date ? new Date(row.contract_renewal_date) : undefined,
    internalNotes: row.internal_notes ?? undefined,
  }
}

function clientToRow(
  input: Omit<Client, 'id' | 'responsible'> & { responsible: User },
): Omit<ClientRow, 'id' | 'created_at'> {
  return {
    name: input.name,
    logo: input.logo ?? null,
    segment: input.segment,
    status: input.status,
    responsible: input.responsible,
    contract_value: input.contractValue,
    last_activity: input.lastActivity instanceof Date
      ? input.lastActivity.toISOString()
      : new Date(input.lastActivity).toISOString(),
    onboarding_date: input.onboardingDate instanceof Date
      ? input.onboardingDate.toISOString()
      : new Date(input.onboardingDate).toISOString(),
    plan: input.plan,
    contact: input.contact,
    contract_start_date: input.contractStartDate
      ? (input.contractStartDate instanceof Date
        ? input.contractStartDate.toISOString().split('T')[0]
        : input.contractStartDate)
      : null,
    contract_renewal_date: input.contractRenewalDate
      ? (input.contractRenewalDate instanceof Date
        ? input.contractRenewalDate.toISOString().split('T')[0]
        : input.contractRenewalDate)
      : null,
    internal_notes: input.internalNotes ?? null,
  }
}

// ── Query params ──────────────────────────────────────────────────────────────

export type FindManyParams = {
  page: number
  limit: number
  status?: Client['status']
  search?: string
}

export type InsertInput = Omit<Client, 'id'> & { responsible: User }
export type UpdateInput = Partial<
  Omit<Client, 'id' | 'responsible' | 'contractStartDate' | 'contractRenewalDate' | 'internalNotes'>
> & {
  responsible?: User
  contractStartDate?: Date | null
  contractRenewalDate?: Date | null
  internalNotes?: string | null
}

// ── Repository ────────────────────────────────────────────────────────────────

export const ClientesRepository = {
  async findMany(
    supabase: SupabaseClient,
    { page, limit, status, search }: FindManyParams,
  ) {
    let query = supabase
      .from('clientes')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (status) query = query.eq('status', status)
    if (search) {
      query = query.or(`name.ilike.%${search}%,segment.ilike.%${search}%`)
    }

    const from = (page - 1) * limit
    const { data, error, count } = await query.range(from, from + limit - 1)

    if (error) throw error

    return {
      items: (data as ClientRow[]).map(rowToClient),
      total: count ?? 0,
      page,
      limit,
    }
  },

  async findById(supabase: SupabaseClient, id: string) {
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return rowToClient(data as ClientRow)
  },

  async insert(supabase: SupabaseClient, input: InsertInput) {
    const row = clientToRow(input)
    const { data, error } = await supabase
      .from('clientes')
      .insert(row)
      .select()
      .single()

    if (error) throw error
    return rowToClient(data as ClientRow)
  },

  async update(supabase: SupabaseClient, id: string, input: UpdateInput) {
    const patch: Partial<Omit<ClientRow, 'id' | 'created_at'>> = {}

    if (input.name !== undefined) patch.name = input.name
    if (input.logo !== undefined) patch.logo = input.logo ?? null
    if (input.segment !== undefined) patch.segment = input.segment
    if (input.status !== undefined) patch.status = input.status
    if (input.responsible !== undefined) patch.responsible = input.responsible
    if (input.contractValue !== undefined) patch.contract_value = input.contractValue
    if (input.plan !== undefined) patch.plan = input.plan
    if (input.contact !== undefined) patch.contact = input.contact
    if (input.lastActivity !== undefined) {
      patch.last_activity = input.lastActivity instanceof Date
        ? input.lastActivity.toISOString()
        : new Date(input.lastActivity).toISOString()
    }
    if (input.contractStartDate !== undefined) {
      patch.contract_start_date = input.contractStartDate
        ? (input.contractStartDate instanceof Date
          ? input.contractStartDate.toISOString().split('T')[0]
          : input.contractStartDate)
        : null
    }
    if (input.contractRenewalDate !== undefined) {
      patch.contract_renewal_date = input.contractRenewalDate
        ? (input.contractRenewalDate instanceof Date
          ? input.contractRenewalDate.toISOString().split('T')[0]
          : input.contractRenewalDate)
        : null
    }
    if (input.internalNotes !== undefined) patch.internal_notes = input.internalNotes ?? null

    const { data, error } = await supabase
      .from('clientes')
      .update(patch)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return rowToClient(data as ClientRow)
  },

  async delete(supabase: SupabaseClient, id: string) {
    const { error } = await supabase.from('clientes').delete().eq('id', id)
    if (error) throw error
  },
}
