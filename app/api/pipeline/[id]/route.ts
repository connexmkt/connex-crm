/**
 * GET /api/pipeline/:id
 *
 * Response 200: { data: PipelineLead }
 * Response 401: Unauthorized
 * Response 404: Lead não encontrado
 * Response 500: Internal Server Error
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * PUT /api/pipeline/:id
 *
 * Atualiza campos do lead sem mover o estágio.
 * Para mover de estágio use PATCH /api/pipeline/:id/stage.
 *
 * Body (JSON) — todos os campos são opcionais:
 *   companyName?    string  (2–200 chars)
 *   contactName?    string  (2–200 chars)
 *   contactEmail?   string  (email) | null
 *   contactPhone?   string  (8–50) | null
 *   estimatedValue? number  (≥ 0)
 *   responsibleId?  string  (UUID)
 *   source?         'site' | 'indicacao' | 'prospeccao'
 *   lastContactAt?  string  (ISO datetime) | null
 *   nextAction?     string  (max: 500) | null
 *   nextActionDate? string  (date YYYY-MM-DD) | null
 *   meetingDate?    string  (date YYYY-MM-DD) | null
 *   notes?          string  (max: 5000) | null
 *   staleAfterDays? number  (> 0)
 *
 * Response 200: { data: PipelineLead }
 * Response 400: Bad Request
 * Response 401: Unauthorized
 * Response 404: Lead não encontrado
 * Response 500: Internal Server Error
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * DELETE /api/pipeline/:id
 *
 * Response 204: No Content
 * Response 401: Unauthorized
 * Response 404: Lead não encontrado
 * Response 500: Internal Server Error
 */

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/server'
import { PipelineService } from '@/lib/services/pipeline.service'
import {
  ok,
  noContent,
  badRequest,
  unauthorized,
  notFound,
  serverError,
} from '@/lib/api/response'

const LEAD_SOURCES = ['site', 'indicacao', 'prospeccao'] as const

const idSchema = z.string().uuid()

const updateLeadSchema = z.object({
  companyName: z.string().min(2).max(200).optional(),
  contactName: z.string().min(2).max(200).optional(),
  contactEmail: z.string().email().nullable().optional(),
  contactPhone: z.string().min(8).max(50).nullable().optional(),
  estimatedValue: z.number().min(0).optional(),
  responsibleId: z.string().uuid().optional(),
  source: z.enum(LEAD_SOURCES).optional(),
  lastContactAt: z.string().datetime().nullable().optional(),
  nextAction: z.string().max(500).nullable().optional(),
  nextActionDate: z.string().date().nullable().optional(),
  meetingDate: z.string().date().nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  staleAfterDays: z.number().int().positive().optional(),
})

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return unauthorized()

  const { id } = await params
  const idParsed = idSchema.safeParse(id)
  if (!idParsed.success) return badRequest({ message: 'ID inválido' })

  try {
    const lead = await PipelineService.getById(supabase, idParsed.data)
    return ok(lead)
  } catch (err: unknown) {
    if (isNotFoundError(err)) return notFound('Lead')
    console.error('[GET /api/pipeline/:id]', err)
    return serverError()
  }
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return unauthorized()

  const { id } = await params
  const idParsed = idSchema.safeParse(id)
  if (!idParsed.success) return badRequest({ message: 'ID inválido' })

  const body = await request.json().catch(() => null)
  if (!body) return badRequest({ message: 'JSON inválido no corpo da requisição' })

  const parsed = updateLeadSchema.safeParse(body)
  if (!parsed.success) return badRequest(parsed.error.flatten())

  try {
    const lead = await PipelineService.update(supabase, idParsed.data, parsed.data)
    return ok(lead)
  } catch (err: unknown) {
    if (isNotFoundError(err)) return notFound('Lead')
    console.error('[PUT /api/pipeline/:id]', err)
    return serverError()
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return unauthorized()

  const { id } = await params
  const idParsed = idSchema.safeParse(id)
  if (!idParsed.success) return badRequest({ message: 'ID inválido' })

  try {
    await PipelineService.delete(supabase, idParsed.data)
    return noContent()
  } catch (err: unknown) {
    if (isNotFoundError(err)) return notFound('Lead')
    console.error('[DELETE /api/pipeline/:id]', err)
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
