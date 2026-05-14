import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/server'
import { TasksService } from '@/lib/services/tasks.service'
import {
  ok,
  created,
  badRequest,
  unauthorized,
  serverError,
} from '@/lib/api/response'

const listQuerySchema = z.object({
  completed: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
  limit: z.coerce.number().int().min(1).max(100).optional(),
})

const createTaskSchema = z.object({
  title: z.string().min(2).max(200),
  dueDate: z.string(), // Aceita ISO string ou data simples
  priority: z.enum(['high', 'medium', 'low']),
  assigneeId: z.string().uuid(),
})

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return unauthorized()

  const { searchParams } = request.nextUrl
  const parsed = listQuerySchema.safeParse(Object.fromEntries(searchParams))
  if (!parsed.success) return badRequest(parsed.error.flatten())

  try {
    const tasks = await TasksService.list(supabase, {
      ownerId: user.id,
      ...parsed.data,
    })
    return ok(tasks)
  } catch (err) {
    console.error('[GET /api/tasks]', err)
    return serverError()
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return unauthorized()

  const body = await request.json().catch(() => null)
  if (!body)
    return badRequest({ message: 'JSON inválido no corpo da requisição' })

  const parsed = createTaskSchema.safeParse(body)
  if (!parsed.success) return badRequest(parsed.error.flatten())

  try {
    const task = await TasksService.create(supabase, parsed.data)
    return created(task)
  } catch (err) {
    console.error('[POST /api/tasks]', err)
    return serverError()
  }
}
