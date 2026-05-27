import type { SupabaseClient } from '@supabase/supabase-js'
import {
  ConteudoRepository,
  type FindConteudoParams,
  type InsertConteudoInput,
  type UpdateConteudoInput,
} from '@/lib/repositories/conteudo.repository'
import type { ContentItem } from '@/lib/types'

export type CreateConteudoInput = {
  clientId: string
  platform: ContentItem['platform']
  type: ContentItem['type']
  title: string
  caption?: string
  publishDate: string   // YYYY-MM-DD
  publishTime: string   // HH:mm
  status: ContentItem['status']
  responsibleId: string
}

export type UpdateConteudoServiceInput = {
  clientId?: string
  platform?: ContentItem['platform']
  type?: ContentItem['type']
  title?: string
  caption?: string
  publishDate?: string
  publishTime?: string
  status?: ContentItem['status']
  responsibleId?: string
}

export const ConteudoService = {
  async list(supabase: SupabaseClient, params: FindConteudoParams = {}) {
    return ConteudoRepository.findMany(supabase, params)
  },

  async create(supabase: SupabaseClient, input: CreateConteudoInput) {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) throw new Error('Unauthenticated')

    // Resolve client
    const { data: clientRow, error: clientError } = await supabase
      .from('clientes')
      .select('id, name, logo, segment, status, responsible, contract_value, last_activity, onboarding_date, source, source_referrer, servicos_contratados, contact')
      .eq('id', input.clientId)
      .single()

    if (clientError || !clientRow) throw new Error('Cliente não encontrado')

    const client = {
      id: clientRow.id,
      name: clientRow.name,
      logo: clientRow.logo ?? undefined,
      segment: clientRow.segment,
      status: clientRow.status,
      responsible: clientRow.responsible,
      contractValue: clientRow.contract_value,
      lastActivity: new Date(clientRow.last_activity),
      onboardingDate: new Date(clientRow.onboarding_date),
      source: clientRow.source,
      sourceReferrer: clientRow.source_referrer ?? undefined,
      servicos: clientRow.servicos_contratados ?? [],
      contact: clientRow.contact,
    }

    // Resolve responsible
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, name, email, avatar, role')
      .eq('id', input.responsibleId)
      .single()

    if (profileError || !profile) throw new Error('Responsável não encontrado')

    const responsible = {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      avatar: profile.avatar ?? '',
      role: profile.role,
    }

    const insertPayload: InsertConteudoInput = {
      clientId: input.clientId,
      client,
      platform: input.platform,
      type: input.type,
      title: input.title,
      caption: input.caption,
      publishDate: input.publishDate,
      publishTime: input.publishTime,
      status: input.status,
      responsible,
      responsibleId: profile.id,
      ownerId: user.id,
    }

    return ConteudoRepository.insert(supabase, insertPayload)
  },

  async update(supabase: SupabaseClient, id: string, input: UpdateConteudoServiceInput) {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) throw new Error('Unauthenticated')

    const patch: UpdateConteudoInput = {}

    if (input.platform !== undefined) patch.platform = input.platform
    if (input.type !== undefined) patch.type = input.type
    if (input.title !== undefined) patch.title = input.title
    if ('caption' in input) patch.caption = input.caption
    if (input.publishDate !== undefined) patch.publishDate = input.publishDate
    if (input.publishTime !== undefined) patch.publishTime = input.publishTime
    if (input.status !== undefined) patch.status = input.status

    if (input.clientId !== undefined) {
      const { data: clientRow, error } = await supabase
        .from('clientes')
        .select('id, name, logo, segment, status, responsible, contract_value, last_activity, onboarding_date, source, source_referrer, servicos_contratados, contact')
        .eq('id', input.clientId)
        .single()

      if (error || !clientRow) throw new Error('Cliente não encontrado')
      patch.clientId = input.clientId
      patch.client = {
        id: clientRow.id,
        name: clientRow.name,
        logo: clientRow.logo ?? undefined,
        segment: clientRow.segment,
        status: clientRow.status,
        responsible: clientRow.responsible,
        contractValue: clientRow.contract_value,
        lastActivity: new Date(clientRow.last_activity),
        onboardingDate: new Date(clientRow.onboarding_date),
        source: clientRow.source,
        sourceReferrer: clientRow.source_referrer ?? undefined,
        servicos: clientRow.servicos_contratados ?? [],
        contact: clientRow.contact,
      }
    }

    if (input.responsibleId !== undefined) {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, name, email, avatar, role')
        .eq('id', input.responsibleId)
        .single()

      if (error || !profile) throw new Error('Responsável não encontrado')
      patch.responsible = {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        avatar: profile.avatar ?? '',
        role: profile.role,
      }
      patch.responsibleId = profile.id
    }

    return ConteudoRepository.update(supabase, id, patch)
  },

  async delete(supabase: SupabaseClient, id: string) {
    return ConteudoRepository.delete(supabase, id)
  },
}
