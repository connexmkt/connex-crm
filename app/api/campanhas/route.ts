/**
 * GET /api/campanhas
 *
 * Retorna todas as campanhas.
 * Dados simulados no servidor até a tabela `campanhas` existir no Supabase.
 *
 * Response 200: { data: Campaign[] }
 * Response 401: Unauthorized
 * Response 500: Internal Server Error
 */

import { createClient } from '@/lib/server'
import { ok, unauthorized, serverError } from '@/lib/api/response'
import { MOCK_CAMPANHAS } from '@/lib/mocks/campanhas'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return unauthorized()

  try {
    return ok(MOCK_CAMPANHAS)
  } catch (err) {
    console.error('[GET /api/campanhas]', err)
    return serverError()
  }
}
