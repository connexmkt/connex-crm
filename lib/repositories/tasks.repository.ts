import type { SupabaseClient } from '@supabase/supabase-js'
import type { Task, User } from '@/lib/types'

interface TaskRow {
  id: string
  title: string
  due_date: string
  priority: Task['priority']
  assignee: User
  assignee_id: string | null
  completed: boolean
  owner_id: string
  created_at: string
}

function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    dueDate: new Date(row.due_date),
    priority: row.priority,
    assignee: row.assignee,
    completed: row.completed,
  }
}

function taskToRow(
  input: Omit<Task, 'id'>,
  ownerId: string,
  assigneeId?: string,
): Omit<TaskRow, 'id' | 'created_at'> {
  return {
    title: input.title,
    due_date: input.dueDate instanceof Date
      ? input.dueDate.toISOString()
      : new Date(input.dueDate).toISOString(),
    priority: input.priority,
    assignee: input.assignee,
    assignee_id: assigneeId ?? null,
    completed: input.completed,
    owner_id: ownerId,
  }
}

export type FindManyParams = {
  ownerId: string
  limit?: number
  completed?: boolean
}

export type InsertInput = Omit<Task, 'id'> & { ownerId: string; assigneeId?: string }
export type UpdateInput = Partial<Omit<Task, 'id'>> & { assigneeId?: string }

export const TasksRepository = {
  async findMany(
    supabase: SupabaseClient,
    { ownerId, limit = 10, completed }: FindManyParams,
  ) {
    let query = supabase
      .from('tasks')
      .select('*')
      .eq('owner_id', ownerId)
      .order('due_date', { ascending: true })
      .limit(limit)

    if (completed !== undefined) {
      query = query.eq('completed', completed)
    }

    const { data, error } = await query

    if (error) throw error

    return (data as TaskRow[]).map(rowToTask)
  },

  async findById(supabase: SupabaseClient, id: string) {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return rowToTask(data as TaskRow)
  },

  async insert(supabase: SupabaseClient, input: InsertInput) {
    const { ownerId, assigneeId, ...taskData } = input
    const row = taskToRow(taskData, ownerId, assigneeId)
    const { data, error } = await supabase
      .from('tasks')
      .insert(row)
      .select()
      .single()

    if (error) throw error
    return rowToTask(data as TaskRow)
  },

  async update(
    supabase: SupabaseClient,
    id: string,
    input: UpdateInput,
  ) {
    const { assigneeId, ...taskData } = input
    const patch: Partial<TaskRow> = {}

    if (taskData.title !== undefined) patch.title = taskData.title
    if (taskData.priority !== undefined) patch.priority = taskData.priority
    if (taskData.assignee !== undefined) patch.assignee = taskData.assignee
    if (taskData.completed !== undefined) patch.completed = taskData.completed
    if (assigneeId !== undefined) patch.assignee_id = assigneeId
    if (taskData.dueDate !== undefined) {
      patch.due_date = taskData.dueDate instanceof Date
        ? taskData.dueDate.toISOString()
        : new Date(taskData.dueDate).toISOString()
    }

    const { data, error } = await supabase
      .from('tasks')
      .update(patch)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return rowToTask(data as TaskRow)
  },

  async delete(supabase: SupabaseClient, id: string) {
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (error) throw error
  },
}
