/**
 * GET  /api/conteudo  — lista os itens de conteúdo (com filtros opcionais)
 * POST /api/conteudo  — cria um novo item de conteúdo
 */

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/server'
import { ok, created, badRequest, unauthorized, serverError } from '@/lib/api/response'
import { ConteudoService } from '@/lib/services/conteudo.service'

const listQuerySchema = z.object({
  clientId: z.string().optional(),
  status: z.enum(['Rascunho', 'Aguardando aprovação', 'Aprovado', 'Publicado']).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
})

const createSchema = z.object({
  clientId: z.string().min(1),
  platform: z.enum(['Instagram', 'LinkedIn', 'YouTube', 'Blog']),
  type: z.enum(['Feed', 'Stories', 'Reels', 'Artigo']),
  title: z.string().min(2).max(200),
  caption: z.string().max(2000).optional(),
  publishDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato esperado: YYYY-MM-DD'),
  publishTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato esperado: HH:mm').default('10:00'),
  status: z.enum(['Rascunho', 'Aguardando aprovação', 'Aprovado', 'Publicado']).default('Rascunho'),
  responsibleId: z.string().uuid(),
})

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return unauthorized()

  const parsed = listQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams))
  if (!parsed.success) return badRequest(parsed.error.flatten())

  try {
    const items = await ConteudoService.list(supabase, parsed.data)
    return ok(items)
  } catch (err) {
    console.error('[GET /api/conteudo]', err)
    return serverError()
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return unauthorized()

  const body = await request.json().catch(() => null)
  if (!body) return badRequest('JSON inválido')

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return badRequest(parsed.error.flatten())

  try {
    const item = await ConteudoService.create(supabase, parsed.data)
    return created(item)
  } catch (err) {
    console.error('[POST /api/conteudo]', err)
    return serverError()
  }
}
