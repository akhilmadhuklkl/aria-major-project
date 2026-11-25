export type NotificationRecord = {
  id: number
  kind: string
  title: string
  message: string
  readAt: string | null
  createdAt: string
}

export interface NotificationRepository {
  createNotification(input: Pick<NotificationRecord, 'kind' | 'title' | 'message'>): NotificationRecord
  listNotifications(limit?: number): NotificationRecord[]
  markNotificationRead(id: number): boolean
  markAllNotificationsRead(): number | bigint
}
