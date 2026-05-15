import type { SupabaseClient } from '@supabase/supabase-js'
import type { ClientContato, ClientContatoType, ClientContatoChannel } from '@/lib/types'

// ── DB row shape ──────────────────────────────────────────────────────────────

interface ContatoRow {
  id: string
  cliente_id: string
  name: string
  role: string
  email: string | null
  whatsapp: string | null
  preferred_channel: ClientContatoChannel | null
  type: ClientContatoType
  created_at: string
}

// ── Mapping helpers ───────────────────────────────────────────────────────────

function rowToContato(row: ContatoRow): ClientContato {
  return {
    id: row.id,
    clienteId: row.cliente_id,
    name: row.name,
    role: row.role,
    email: row.email ?? undefined,
    whatsapp: row.whatsapp ?? undefined,
    preferredChannel: row.preferred_channel ?? undefined,
    type: row.type,
    createdAt: new Date(row.created_at),
  }
}

// ── Input types ───────────────────────────────────────────────────────────────

export type InsertContatoInput = Omit<ClientContato, 'id' | 'createdAt'>
export type UpdateContatoInput = Partial<Omit<ClientContato, 'id' | 'clienteId' | 'createdAt'>>

// ── Repository ────────────────────────────────────────────────────────────────

export const ContatosRepository = {
  async findByClienteId(supabase: SupabaseClient, clienteId: string): Promise<ClientContato[]> {
    const { data, error } = await supabase
      .from('cliente_contatos')
      .select('*')
      .eq('cliente_id', clienteId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return (data as ContatoRow[]).map(rowToContato)
  },

  async findById(supabase: SupabaseClient, id: string): Promise<ClientContato> {
    const { data, error } = await supabase
      .from('cliente_contatos')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return rowToContato(data as ContatoRow)
  },

  async insert(supabase: SupabaseClient, input: InsertContatoInput): Promise<ClientContato> {
    const { data, error } = await supabase
      .from('cliente_contatos')
      .insert({
        cliente_id: input.clienteId,
        name: input.name,
        role: input.role,
        email: input.email ?? null,
        whatsapp: input.whatsapp ?? null,
        preferred_channel: input.preferredChannel ?? null,
        type: input.type,
      })
      .select()
      .single()

    if (error) throw error
    return rowToContato(data as ContatoRow)
  },

  async update(
    supabase: SupabaseClient,
    id: string,
    input: UpdateContatoInput,
  ): Promise<ClientContato> {
    const patch: Partial<Omit<ContatoRow, 'id' | 'cliente_id' | 'created_at'>> = {}

    if (input.name !== undefined) patch.name = input.name
    if (input.role !== undefined) patch.role = input.role
    if (input.email !== undefined) patch.email = input.email ?? null
    if (input.whatsapp !== undefined) patch.whatsapp = input.whatsapp ?? null
    if (input.preferredChannel !== undefined) patch.preferred_channel = input.preferredChannel ?? null
    if (input.type !== undefined) patch.type = input.type

    const { data, error } = await supabase
      .from('cliente_contatos')
      .update(patch)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return rowToContato(data as ContatoRow)
  },

  async delete(supabase: SupabaseClient, id: string): Promise<void> {
    const { error } = await supabase.from('cliente_contatos').delete().eq('id', id)
    if (error) throw error
  },
}
