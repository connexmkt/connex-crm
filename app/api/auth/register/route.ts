/**
 * POST /api/auth/register
 *
 * Cria um novo usuário no Supabase Auth e insere o perfil na tabela `profiles`.
 * Apenas usuários com role 'Admin' podem registrar novos usuários.
 *
 * Body (JSON):
 *   email     string  (email válido)
 *   password  string  (mín. 8 chars)
 *   name      string  (2–100 chars)
 *   role      'Admin' | 'Gestor' | 'Analista'
 *
 * Response 201: { data: { id, email, name, role } }
 * Response 400: Bad Request (validação)
 * Response 401: Unauthorized
 * Response 403: Forbidden (role insuficiente)
 * Response 409: E-mail já cadastrado
 * Response 500: Internal Server Error
 */

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/server'
import {
  created,
  badRequest,
  unauthorized,
  forbidden,
  conflict,
  serverError,
} from '@/lib/api/response'

const registerSchema = z.object({
  email: z.string().email({ message: 'E-mail inválido' }),
  password: z
    .string()
    .min(8, { message: 'Senha deve ter no mínimo 8 caracteres' })
    .regex(/[A-Z]/, { message: 'Senha deve conter ao menos uma letra maiúscula' })
    .regex(/[0-9]/, { message: 'Senha deve conter ao menos um número' }),
  name: z.string().min(2).max(100),
  role: z.enum(['Admin', 'Gestor', 'Analista']),
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // Apenas usuários autenticados com role Admin podem criar contas
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return unauthorized()

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!callerProfile || callerProfile.role !== 'Admin') return forbidden()

  const body = await request.json().catch(() => null)
  if (!body) return badRequest({ message: 'JSON inválido no corpo da requisição' })

  const parsed = registerSchema.safeParse(body)
  if (!parsed.success) return badRequest(parsed.error.flatten())

  const { email, password, name, role } = parsed.data

  // Cria o usuário no Supabase Auth
  const { data: authData, error: signUpError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (signUpError) {
    if (signUpError.message.toLowerCase().includes('already registered')) {
      return conflict('E-mail já cadastrado')
    }
    console.error('[POST /api/auth/register] signUp error', signUpError)
    return serverError()
  }

  const newUserId = authData.user.id

  // Insere o perfil na tabela profiles
  const { error: profileError } = await supabase.from('profiles').insert({
    id: newUserId,
    email,
    name,
    role,
    avatar: '',
  })

  if (profileError) {
    // Faz rollback do usuário criado para manter consistência
    await supabase.auth.admin.deleteUser(newUserId)
    console.error('[POST /api/auth/register] profile insert error', profileError)
    return serverError()
  }

  return created({ id: newUserId, email, name, role })
}
