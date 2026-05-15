/**
 * PUT /api/clientes/:id/contatos/:contatoId
 *
 * Body (JSON) — todos os campos são opcionais:
 *   name?              string  (1–100 chars)
 *   role?              string  (1–100 chars)
 *   type?              'decisor' | 'financeiro' | 'operacional' | 'outro'
 *   email?             string  (email válido)
 *   whatsapp?          string  (mín. 8 chars)
 *   preferredChannel?  'email' | 'whatsapp' | 'phone' | 'outro'
 *
 * Response 200: { data: ClientContato }
 * Response 400: Bad Request
 * Response 401: Unauthorized
 * Response 404: Contato não encontrado
 * Response 500: Internal Server Error
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * DELETE /api/clientes/:id/contatos/:contatoId
 *
 * Response 204: No Content
 * Response 401: Unauthorized
 * Response 404: Contato não encontrado
 * Response 500: Internal Server Error
 */

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/server'
import { ContatosService } from '@/lib/services/contatos.service'
import {
  ok,
  noContent,
  badRequest,
  unauthorized,
  notFound,
  serverError,
} from '@/lib/api/response'

const idSchema = z.string().uuid()

const updateContatoSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  role: z.string().min(1).max(100).optional(),
  type: z.enum(['decisor', 'financeiro', 'operacional', 'outro']).optional(),
  email: z.string().email().optional(),
  whatsapp: z.string().min(8).optional(),
  preferredChannel: z.enum(['email', 'whatsapp', 'phone', 'outro']).optional(),
})

type RouteContext = { params: Promise<{ id: string; contatoId: string }> }

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return unauthorized()

  const { contatoId } = await params
  const idParsed = idSchema.safeParse(contatoId)
  if (!idParsed.success) return badRequest({ message: 'ID de contato inválido' })

  const body = await request.json().catch(() => null)
  if (!body) return badRequest({ message: 'JSON inválido no corpo da requisição' })

  const parsed = updateContatoSchema.safeParse(body)
  if (!parsed.success) return badRequest(parsed.error.flatten())

  try {
    const contato = await ContatosService.update(supabase, idParsed.data, parsed.data)
    return ok(contato)
  } catch (err: unknown) {
    if (isNotFoundError(err)) return notFound('Contato')
    console.error('[PUT /api/clientes/:id/contatos/:contatoId]', err)
    return serverError()
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return unauthorized()

  const { contatoId } = await params
  const idParsed = idSchema.safeParse(contatoId)
  if (!idParsed.success) return badRequest({ message: 'ID de contato inválido' })

  try {
    await ContatosService.delete(supabase, idParsed.data)
    return noContent()
  } catch (err: unknown) {
    if (isNotFoundError(err)) return notFound('Contato')
    console.error('[DELETE /api/clientes/:id/contatos/:contatoId]', err)
    return serverError()
  }
}

function isNotFoundError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === 'PGRST116'
  )
}
