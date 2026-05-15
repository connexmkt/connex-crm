/**
 * GET /api/clientes/:id/contatos
 *
 * Response 200: { data: ClientContato[] }
 * Response 401: Unauthorized
 * Response 404: Cliente não encontrado
 * Response 500: Internal Server Error
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * POST /api/clientes/:id/contatos
 *
 * Body (JSON):
 *   name              string  (1–100 chars)
 *   role              string  (1–100 chars — cargo)
 *   type              'decisor' | 'financeiro' | 'operacional' | 'outro'
 *   email?            string  (email válido)
 *   whatsapp?         string  (mín. 8 chars)
 *   preferredChannel? 'email' | 'whatsapp' | 'phone' | 'outro'
 *
 * Response 201: { data: ClientContato }
 * Response 400: Bad Request
 * Response 401: Unauthorized
 * Response 404: Cliente não encontrado
 * Response 500: Internal Server Error
 */

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/server'
import { ContatosService } from '@/lib/services/contatos.service'
import {
  ok,
  created,
  badRequest,
  unauthorized,
  notFound,
  serverError,
} from '@/lib/api/response'

const idSchema = z.string().uuid()

const createContatoSchema = z.object({
  name: z.string().min(1).max(100),
  role: z.string().min(1).max(100),
  type: z.enum(['decisor', 'financeiro', 'operacional', 'outro']),
  email: z.string().email().optional(),
  whatsapp: z.string().min(8).optional(),
  preferredChannel: z.enum(['email', 'whatsapp', 'phone', 'outro']).optional(),
})

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return unauthorized()

  const { id } = await params
  const idParsed = idSchema.safeParse(id)
  if (!idParsed.success) return badRequest({ message: 'ID inválido' })

  try {
    const contatos = await ContatosService.listByCliente(supabase, idParsed.data)
    return ok(contatos)
  } catch (err: unknown) {
    if (isNotFoundError(err)) return notFound('Cliente')
    console.error('[GET /api/clientes/:id/contatos]', err)
    return serverError()
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return unauthorized()

  const { id } = await params
  const idParsed = idSchema.safeParse(id)
  if (!idParsed.success) return badRequest({ message: 'ID inválido' })

  const body = await request.json().catch(() => null)
  if (!body) return badRequest({ message: 'JSON inválido no corpo da requisição' })

  const parsed = createContatoSchema.safeParse(body)
  if (!parsed.success) return badRequest(parsed.error.flatten())

  try {
    const contato = await ContatosService.create(supabase, {
      clienteId: idParsed.data,
      ...parsed.data,
    })
    return created(contato)
  } catch (err: unknown) {
    if (isNotFoundError(err)) return notFound('Cliente')
    console.error('[POST /api/clientes/:id/contatos]', err)
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
