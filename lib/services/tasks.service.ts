import type { SupabaseClient } from '@supabase/supabase-js'
import {
  TasksRepository,
  type FindManyParams,
  type InsertInput,
  type UpdateInput,
} from '@/lib/repositories/tasks.repository'
import type { Task } from '@/lib/types'

export type CreateTaskInput = {
  title: string
  dueDate: Date | string
  priority: Task['priority']
  assigneeId: string
}

export type UpdateTaskInput = {
  title?: string
  dueDate?: Date | string
  priority?: Task['priority']
  assigneeId?: string
  completed?: boolean
}

export const TasksService = {
  async list(supabase: SupabaseClient, params: FindManyParams) {
    return TasksRepository.findMany(supabase, params)
  },

  async getById(supabase: SupabaseClient, id: string) {
    return TasksRepository.findById(supabase, id)
  },

  async create(supabase: SupabaseClient, input: CreateTaskInput) {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) throw new Error('Unauthenticated')

    // Resolve assignee profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, name, email, avatar, role')
      .eq('id', input.assigneeId)
      .single()

    if (profileError || !profile) {
      throw new Error('Assignee not found')
    }

    const insertPayload: InsertInput = {
      title: input.title,
      dueDate:
        input.dueDate instanceof Date ? input.dueDate : new Date(input.dueDate),
      priority: input.priority,
      assignee: {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        avatar: profile.avatar ?? '',
        role: profile.role,
      },
      assigneeId: profile.id,
      completed: false,
      ownerId: user.id,
    }

    return TasksRepository.insert(supabase, insertPayload)
  },

  async update(supabase: SupabaseClient, id: string, input: UpdateTaskInput) {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) throw new Error('Unauthenticated')

    // Verify existence (RLS handles ownership)
    await TasksRepository.findById(supabase, id)

    const updatePayload: UpdateInput = {}

    if (input.title !== undefined) updatePayload.title = input.title
    if (input.dueDate !== undefined) {
      updatePayload.dueDate =
        input.dueDate instanceof Date ? input.dueDate : new Date(input.dueDate)
    }
    if (input.priority !== undefined) updatePayload.priority = input.priority
    if (input.completed !== undefined) updatePayload.completed = input.completed

    if (input.assigneeId !== undefined) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, name, email, avatar, role')
        .eq('id', input.assigneeId)
        .single()

      if (profileError || !profile) {
        throw new Error('Assignee not found')
      }

      updatePayload.assignee = {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        avatar: profile.avatar ?? '',
        role: profile.role,
      }
      updatePayload.assigneeId = profile.id
    }

    return TasksRepository.update(supabase, id, updatePayload)
  },

  async delete(supabase: SupabaseClient, id: string) {
    // Verify existence (RLS handles ownership)
    await TasksRepository.findById(supabase, id)
    return TasksRepository.delete(supabase, id)
  },
}
