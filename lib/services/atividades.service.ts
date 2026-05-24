import type { SupabaseClient } from '@supabase/supabase-js'
import {
  AtividadesRepository,
  type FindAtividadesParams,
  type InsertAtividadeInput,
} from '@/lib/repositories/atividades.repository'
import type { AtividadeTipo, AtividadeAssociacaoTipo } from '@/lib/types'

export type CreateAtividadeInput = {
  tipo: AtividadeTipo
  associacaoTipo: AtividadeAssociacaoTipo
  associacaoId: string
  associacaoNome: string
  responsavelId: string
  ocorridoEm: Date | string
  descricao: string
  resultado?: string
  proximoPasso?: string
}

export const AtividadesService = {
  async list(supabase: SupabaseClient, params: FindAtividadesParams = {}) {
    return AtividadesRepository.findMany(supabase, params)
  },

  async create(supabase: SupabaseClient, input: CreateAtividadeInput) {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) throw new Error('Unauthenticated')

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, name, email, avatar, role')
      .eq('id', input.responsavelId)
      .single()

    if (profileError || !profile) throw new Error('Responsável não encontrado')

    const insertPayload: InsertAtividadeInput = {
      tipo: input.tipo,
      associacaoTipo: input.associacaoTipo,
      associacaoId: input.associacaoId,
      associacaoNome: input.associacaoNome,
      responsavel: {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        avatar: profile.avatar ?? '',
        role: profile.role,
      },
      responsavelId: profile.id,
      ocorridoEm:
        input.ocorridoEm instanceof Date
          ? input.ocorridoEm
          : new Date(input.ocorridoEm),
      descricao: input.descricao,
      resultado: input.resultado,
      proximoPasso: input.proximoPasso,
      ownerId: user.id,
    }

    return AtividadesRepository.insert(supabase, insertPayload)
  },

  async delete(supabase: SupabaseClient, id: string) {
    await AtividadesRepository.findById(supabase, id)
    return AtividadesRepository.delete(supabase, id)
  },
}
