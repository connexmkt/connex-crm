import type { SupabaseClient } from '@supabase/supabase-js'
import type { Atividade, AtividadeTipo, AtividadeAssociacaoTipo, User } from '@/lib/types'

interface AtividadeRow {
  id: string
  tipo: AtividadeTipo
  associacao_tipo: AtividadeAssociacaoTipo
  associacao_id: string
  associacao_nome: string
  responsavel: User
  responsavel_id: string | null
  ocorrido_em: string
  descricao: string
  resultado: string | null
  proximo_passo: string | null
  owner_id: string
  created_at: string
}

function rowToAtividade(row: AtividadeRow): Atividade {
  return {
    id: row.id,
    tipo: row.tipo,
    associacaoTipo: row.associacao_tipo,
    associacaoId: row.associacao_id,
    associacaoNome: row.associacao_nome,
    responsavel: row.responsavel,
    responsavelId: row.responsavel_id ?? undefined,
    ocorridoEm: new Date(row.ocorrido_em),
    descricao: row.descricao,
    resultado: row.resultado ?? undefined,
    proximoPasso: row.proximo_passo ?? undefined,
    ownerId: row.owner_id,
    createdAt: new Date(row.created_at),
  }
}

export type FindAtividadesParams = {
  limit?: number
  associacaoTipo?: AtividadeAssociacaoTipo
  associacaoId?: string
  responsavelId?: string
}

export type InsertAtividadeInput = Omit<Atividade, 'id' | 'createdAt'>

export const AtividadesRepository = {
  async findMany(
    supabase: SupabaseClient,
    { limit = 10, associacaoTipo, associacaoId, responsavelId }: FindAtividadesParams = {},
  ): Promise<Atividade[]> {
    let query = supabase
      .from('atividades')
      .select('*')
      .order('ocorrido_em', { ascending: false })
      .limit(limit)

    if (associacaoTipo) query = query.eq('associacao_tipo', associacaoTipo)
    if (associacaoId) query = query.eq('associacao_id', associacaoId)
    if (responsavelId) query = query.eq('responsavel_id', responsavelId)

    const { data, error } = await query
    if (error) throw error
    return (data as AtividadeRow[]).map(rowToAtividade)
  },

  async findById(supabase: SupabaseClient, id: string): Promise<Atividade> {
    const { data, error } = await supabase
      .from('atividades')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return rowToAtividade(data as AtividadeRow)
  },

  async insert(supabase: SupabaseClient, input: InsertAtividadeInput): Promise<Atividade> {
    const row = {
      tipo: input.tipo,
      associacao_tipo: input.associacaoTipo,
      associacao_id: input.associacaoId,
      associacao_nome: input.associacaoNome,
      responsavel: input.responsavel,
      responsavel_id: input.responsavelId ?? null,
      ocorrido_em: input.ocorridoEm instanceof Date
        ? input.ocorridoEm.toISOString()
        : new Date(input.ocorridoEm).toISOString(),
      descricao: input.descricao,
      resultado: input.resultado ?? null,
      proximo_passo: input.proximoPasso ?? null,
      owner_id: input.ownerId,
    }

    const { data, error } = await supabase
      .from('atividades')
      .insert(row)
      .select()
      .single()

    if (error) throw error
    return rowToAtividade(data as AtividadeRow)
  },

  async delete(supabase: SupabaseClient, id: string): Promise<void> {
    const { error } = await supabase.from('atividades').delete().eq('id', id)
    if (error) throw error
  },
}
