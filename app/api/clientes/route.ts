/**
 * GET /api/clientes
 *
 * Query params:
 *   page?    number  (default: 1)
 *   limit?   number  (default: 20, max: 100)
 *   status?  'Ativo' | 'Lead' | 'Inativo' | 'Em risco'
 *   search?  string  (max: 100, busca por nome)
 *
 * Response 200:
 *   { data: { items: Client[], total: number, page: number, limit: number } }
 * Response 400: Bad Request (erros de validação)
 * Response 401: Unauthorized
 * Response 500: Internal Server Error
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * POST /api/clientes
 *
 * Body (JSON):
 *   name           string  (2–100 chars)
 *   segment        string
 *   status         'Ativo' | 'Lead' | 'Inativo' | 'Em risco'
 *   contractValue  number  (positive)
 *   responsibleId? string  (UUID — padrão: usuário autenticado)
 *   contact.email  string  (email válido)
 *   contact.phone  string  (mín. 8 chars)
 *   contact.website? string (URL opcional)
 *
 * Response 201: { data: Client }
 * Response 400: Bad Request (erros de validação)
 * Response 401: Unauthorized
 * Response 500: Internal Server Error
 */

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/server'
import { ClientesService } from '@/lib/services/clientes.service'
import {
  ok,
  created,
  badRequest,
  unauthorized,
  serverError,
} from '@/lib/api/response'

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['Ativo', 'Lead', 'Inativo', 'Em risco']).optional(),
  search: z.string().max(100).optional(),
})

const createClienteSchema = z.object({
  name: z.string().min(2).max(100),
  logo: z.string().url().optional(),
  segment: z.string().min(1),
  status: z.enum(['Ativo', 'Lead', 'Inativo', 'Em risco']),
  source: z.enum(['indicacao', 'instagram', 'site', 'prospeccao', 'evento']),
  sourceReferrer: z.string().optional(),
  servicos: z.array(z.enum(['social_media', 'trafego_pago', 'branding', 'conteudo', 'design', 'seo'])).default([]),
  contractValue: z.number().positive(),
  responsibleId: z.string().uuid().optional(),
  contact: z.object({
    email: z.string().email(),
    phone: z.string().min(8),
    website: z.string().url().optional(),
  }),
  contractStartDate: z.string().date().optional(),
  contractRenewalDate: z.string().date().optional(),
  internalNotes: z.string().max(5000).optional(),
})

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return unauthorized()

  const { searchParams } = request.nextUrl
  const parsed = listQuerySchema.safeParse(Object.fromEntries(searchParams))
  if (!parsed.success) return badRequest(parsed.error.flatten())

  try {
    const result = await ClientesService.list(supabase, parsed.data)
    return ok(result)
  } catch (err) {
    console.error('[GET /api/clientes]', err)
    return serverError()
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return unauthorized()

  const body = await request.json().catch(() => null)
  if (!body) return badRequest({ message: 'JSON inválido no corpo da requisição' })

  const parsed = createClienteSchema.safeParse(body)
  if (!parsed.success) return badRequest(parsed.error.flatten())

  try {
    const cliente = await ClientesService.create(supabase, {
      ...parsed.data,
      responsibleId: parsed.data.responsibleId ?? user.id,
    })
    return created(cliente)
  } catch (err) {
    console.error('[POST /api/clientes]', err)
    return serverError()
  }
}
