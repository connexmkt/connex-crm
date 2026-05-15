/**
 * DELETE /api/clientes/:id/arquivos/:arquivoId
 *
 * Remove o registro do banco e o objeto do Storage.
 *
 * Response 204: No Content
 * Response 401: Unauthorized
 * Response 404: Arquivo não encontrado
 * Response 500: Internal Server Error
 */

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/server'
import { ArquivosService } from '@/lib/services/arquivos.service'
import {
  noContent,
  badRequest,
  unauthorized,
  notFound,
  serverError,
} from '@/lib/api/response'

const idSchema = z.string().uuid()

type RouteContext = { params: Promise<{ id: string; arquivoId: string }> }

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return unauthorized()

  const { arquivoId } = await params
  const idParsed = idSchema.safeParse(arquivoId)
  if (!idParsed.success) return badRequest({ message: 'ID de arquivo inválido' })

  try {
    await ArquivosService.delete(supabase, idParsed.data)
    return noContent()
  } catch (err: unknown) {
    if (isNotFoundError(err)) return notFound('Arquivo')
    console.error('[DELETE /api/clientes/:id/arquivos/:arquivoId]', err)
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
