import type { SupabaseClient } from '@supabase/supabase-js'
import type { Notification } from '@/lib/types'

export type CreateNotificationInput = {
  title: string
  message: string
  type: Notification['type']
}

type NotificationRow = {
  id: string
  user_id: string
  title: string
  message: string
  type: string
  read: boolean
  created_at: string
}

function toNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    type: row.type as Notification['type'],
    read: row.read,
    timestamp: new Date(row.created_at),
  }
}

export const NotificationsService = {
  /**
   * Lista as notificações do usuário autenticado, ordenadas da mais recente para a mais antiga.
   */
  async listForUser(
    supabase: SupabaseClient,
    userId: string,
    limit = 20,
  ): Promise<Notification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('id, user_id, title, message, type, read, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return (data ?? []).map(toNotification)
  },

  /**
   * Marca uma notificação como lida (pertencente ao userId informado).
   */
  async markAsRead(
    supabase: SupabaseClient,
    notificationId: string,
    userId: string,
  ): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)
      .eq('user_id', userId)

    if (error) throw error
  },

  /**
   * Marca todas as notificações do usuário como lidas.
   */
  async markAllAsRead(supabase: SupabaseClient, userId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false)

    if (error) throw error
  },

  /**
   * Envia uma notificação para todos os usuários cadastrados na tabela profiles.
   * Insere uma linha por usuário para permitir controle individual de leitura.
   */
  async broadcast(
    supabase: SupabaseClient,
    input: CreateNotificationInput,
  ): Promise<void> {
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id')

    if (profilesError) throw profilesError
    if (!profiles?.length) return

    const rows = profiles.map((p: { id: string }) => ({
      user_id: p.id,
      title: input.title,
      message: input.message,
      type: input.type,
      read: false,
    }))

    const { error } = await supabase.from('notifications').insert(rows)
    if (error) throw error
  },
}
