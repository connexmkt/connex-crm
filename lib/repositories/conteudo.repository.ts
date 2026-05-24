import type { SupabaseClient } from '@supabase/supabase-js'
import type { ContentItem, User } from '@/lib/types'

// ── DB row shape (snake_case Postgres columns) ────────────────────────────────

interface ConteudoRow {
  id: string
  client_id: string
  client: ContentItem['client']
  platform: ContentItem['platform']
  type: ContentItem['type']
  title: string
  caption: string | null
  image_url: string | null
  publish_date: string
  publish_time: string
  status: ContentItem['status']
  responsible: User
  responsible_id: string | null
  owner_id: string
  created_at: string
}

// ── Column mapping ─────────────────────────────────────────────────────────────

function rowToContentItem(row: ConteudoRow): ContentItem & { publishTime: string; ownerId: string } {
  return {
    id: row.id,
    client: row.client,
    platform: row.platform,
    type: row.type,
    title: row.title,
    caption: row.caption ?? undefined,
    imageUrl: row.image_url ?? undefined,
    publishDate: new Date(`${row.publish_date}T${row.publish_time}`),
    publishTime: row.publish_time,
    status: row.status,
    responsible: row.responsible,
    ownerId: row.owner_id,
  }
}

// ── Query params ──────────────────────────────────────────────────────────────

export type FindConteudoParams = {
  clientId?: string
  status?: ContentItem['status']
  from?: string  // YYYY-MM-DD
  to?: string    // YYYY-MM-DD
  limit?: number
}

export type InsertConteudoInput = {
  clientId: string
  client: ContentItem['client']
  platform: ContentItem['platform']
  type: ContentItem['type']
  title: string
  caption?: string
  imageUrl?: string
  publishDate: string   // YYYY-MM-DD
  publishTime: string   // HH:mm
  status: ContentItem['status']
  responsible: User
  responsibleId?: string
  ownerId: string
}

export type UpdateConteudoInput = Partial<Omit<InsertConteudoInput, 'ownerId'>>

// ── Repository ─────────────────────────────────────────────────────────────────

export const ConteudoRepository = {
  async findMany(supabase: SupabaseClient, params: FindConteudoParams = {}) {
    let query = supabase
      .from('conteudo')
      .select('*')
      .order('publish_date', { ascending: true })

    if (params.clientId) query = query.eq('client_id', params.clientId)
    if (params.status) query = query.eq('status', params.status)
    if (params.from) query = query.gte('publish_date', params.from)
    if (params.to) query = query.lte('publish_date', params.to)
    if (params.limit) query = query.limit(params.limit)

    const { data, error } = await query
    if (error) throw error
    return (data as ConteudoRow[]).map(rowToContentItem)
  },

  async findById(supabase: SupabaseClient, id: string) {
    const { data, error } = await supabase
      .from('conteudo')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return rowToContentItem(data as ConteudoRow)
  },

  async insert(supabase: SupabaseClient, input: InsertConteudoInput) {
    const { data, error } = await supabase
      .from('conteudo')
      .insert({
        client_id: input.clientId,
        client: input.client,
        platform: input.platform,
        type: input.type,
        title: input.title,
        caption: input.caption ?? null,
        image_url: input.imageUrl ?? null,
        publish_date: input.publishDate,
        publish_time: input.publishTime,
        status: input.status,
        responsible: input.responsible,
        responsible_id: input.responsibleId ?? null,
        owner_id: input.ownerId,
      })
      .select()
      .single()

    if (error) throw error
    return rowToContentItem(data as ConteudoRow)
  },

  async update(supabase: SupabaseClient, id: string, input: UpdateConteudoInput) {
    const patch: Record<string, unknown> = {}

    if (input.clientId !== undefined) patch.client_id = input.clientId
    if (input.client !== undefined) patch.client = input.client
    if (input.platform !== undefined) patch.platform = input.platform
    if (input.type !== undefined) patch.type = input.type
    if (input.title !== undefined) patch.title = input.title
    if ('caption' in input) patch.caption = input.caption ?? null
    if ('imageUrl' in input) patch.image_url = input.imageUrl ?? null
    if (input.publishDate !== undefined) patch.publish_date = input.publishDate
    if (input.publishTime !== undefined) patch.publish_time = input.publishTime
    if (input.status !== undefined) patch.status = input.status
    if (input.responsible !== undefined) patch.responsible = input.responsible
    if ('responsibleId' in input) patch.responsible_id = input.responsibleId ?? null

    const { data, error } = await supabase
      .from('conteudo')
      .update(patch)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return rowToContentItem(data as ConteudoRow)
  },

  async delete(supabase: SupabaseClient, id: string) {
    const { error } = await supabase.from('conteudo').delete().eq('id', id)
    if (error) throw error
  },
}
