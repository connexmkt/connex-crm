import type { SupabaseClient } from '@supabase/supabase-js'
import {
  ContatosRepository,
  type InsertContatoInput,
  type UpdateContatoInput,
} from '@/lib/repositories/contatos.repository'
import { ClientesRepository } from '@/lib/repositories/clientes.repository'
import type { ClientContatoType, ClientContatoChannel } from '@/lib/types'

export type CreateContatoInput = {
  clienteId: string
  name: string
  role: string
  email?: string
  whatsapp?: string
  preferredChannel?: ClientContatoChannel
  type: ClientContatoType
}

export type UpdateContatoServiceInput = {
  name?: string
  role?: string
  email?: string
  whatsapp?: string
  preferredChannel?: ClientContatoChannel
  type?: ClientContatoType
}

export const ContatosService = {
  async listByCliente(supabase: SupabaseClient, clienteId: string) {
    // Verify the client exists before listing
    await ClientesRepository.findById(supabase, clienteId)
    return ContatosRepository.findByClienteId(supabase, clienteId)
  },

  async create(supabase: SupabaseClient, input: CreateContatoInput) {
    // Verify the client exists
    await ClientesRepository.findById(supabase, input.clienteId)

    const payload: InsertContatoInput = {
      clienteId: input.clienteId,
      name: input.name,
      role: input.role,
      email: input.email,
      whatsapp: input.whatsapp,
      preferredChannel: input.preferredChannel,
      type: input.type,
    }

    return ContatosRepository.insert(supabase, payload)
  },

  async update(supabase: SupabaseClient, id: string, input: UpdateContatoServiceInput) {
    // Verify the contact exists
    await ContatosRepository.findById(supabase, id)

    const payload: UpdateContatoInput = {}
    if (input.name !== undefined) payload.name = input.name
    if (input.role !== undefined) payload.role = input.role
    if (input.email !== undefined) payload.email = input.email
    if (input.whatsapp !== undefined) payload.whatsapp = input.whatsapp
    if (input.preferredChannel !== undefined) payload.preferredChannel = input.preferredChannel
    if (input.type !== undefined) payload.type = input.type

    return ContatosRepository.update(supabase, id, payload)
  },

  async delete(supabase: SupabaseClient, id: string) {
    // Verify the contact exists
    await ContatosRepository.findById(supabase, id)
    return ContatosRepository.delete(supabase, id)
  },
}
