/**
 * GET /api/clientes/:id/arquivos
 *
 * Response 200: { data: ClientArquivo[] }   (cada item inclui signedUrl temporária)
 * Response 401: Unauthorized
 * Response 404: Cliente não encontrado
 * Response 500: Internal Server Error
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * POST /api/clientes/:id/arquivos
 *
 * Body: multipart/form-data
 *   file      File    (PDF, imagem, Word, Excel — máx. 50 MB)
 *   name      string  (nome de exibição do arquivo)
 *   fileType  'contrato_assinado' | 'briefing' | 'proposta' | 'outro'
 *
 * Response 201: { data: ClientArquivo }
 * Response 400: Bad Request
 * Response 401: Unauthorized
 * Response 404: Cliente não encontrado
 * Response 500: Internal Server Error
 */

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/server'
import { ArquivosService } from '@/lib/services/arquivos.service'
import {
  ok,
  created,
  badRequest,
  unauthorized,
  notFound,
  serverError,
} from '@/lib/api/response'

const idSchema = z.string().uuid()

const FILE_TYPE_VALUES = ['contrato_assinado', 'briefing', 'proposta', 'outro'] as const

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return unauthorized()

  const { id } = await params
  const idParsed = idSchema.safeParse(id)
  if (!idParsed.success) return badRequest({ message: 'ID inválido' })

  try {
    const arquivos = await ArquivosService.listByCliente(supabase, idParsed.data)
    return ok(arquivos)
  } catch (err: unknown) {
    if (isNotFoundError(err)) return notFound('Cliente')
    console.error('[GET /api/clientes/:id/arquivos]', err)
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

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return badRequest({ message: 'Corpo da requisição deve ser multipart/form-data' })
  }

  const file = formData.get('file')
  const name = formData.get('name')
  const fileType = formData.get('fileType')

  if (!(file instanceof File)) return badRequest({ message: 'Campo "file" é obrigatório' })
  if (typeof name !== 'string' || name.trim().length === 0) {
    return badRequest({ message: 'Campo "name" é obrigatório' })
  }
  if (!FILE_TYPE_VALUES.includes(fileType as (typeof FILE_TYPE_VALUES)[number])) {
    return badRequest({
      message: `Campo "fileType" deve ser um de: ${FILE_TYPE_VALUES.join(', ')}`,
    })
  }

  try {
    const arquivo = await ArquivosService.upload(supabase, {
      clienteId: idParsed.data,
      name: name.trim(),
      fileType: fileType as (typeof FILE_TYPE_VALUES)[number],
      file,
      uploadedBy: user.id,
    })
    return created(arquivo)
  } catch (err: unknown) {
    if (isNotFoundError(err)) return notFound('Cliente')
    console.error('[POST /api/clientes/:id/arquivos]', err)
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
