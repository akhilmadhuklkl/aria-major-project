import type { Pool, PoolClient } from 'pg'
import type { AsyncNotificationRepository, NotificationRecord } from './notification-repository.js'

type NotificationRow = Omit<NotificationRecord, 'id' | 'readAt' | 'createdAt'> & {
  id: string | number
  readAt: Date | string | null
  createdAt: Date | string
}

const columns = 'id, kind, title, message, read_at AS "readAt", created_at AS "createdAt"'
const toIso = (value: Date | string) => new Date(value).toISOString()
const toNotification = (row: NotificationRow): NotificationRecord => ({
  ...row, id: Number(row.id), readAt: row.readAt === null ? null : toIso(row.readAt), createdAt: toIso(row.createdAt),
})

export function createPostgresNotificationRepository(client: Pick<Pool | PoolClient, 'query'>): AsyncNotificationRepository {
  return {
    async createNotification(input) {
      const result = await client.query<NotificationRow>(`
        INSERT INTO notifications (kind, title, message, created_at) VALUES ($1, $2, $3, $4)
        RETURNING ${columns}
      `, [input.kind, input.title, input.message, new Date().toISOString()])
      return toNotification(result.rows[0])
    },
    async listNotifications(limit = 20) {
      const result = await client.query<NotificationRow>(`SELECT ${columns} FROM notifications ORDER BY created_at DESC LIMIT $1`, [Math.max(1, Math.min(limit, 100))])
      return result.rows.map(toNotification)
    },
    async markNotificationRead(id) {
      const result = await client.query('UPDATE notifications SET read_at = $1 WHERE id = $2', [new Date().toISOString(), id])
      return (result.rowCount ?? 0) > 0
    },
    async markAllNotificationsRead() {
      const result = await client.query('UPDATE notifications SET read_at = $1 WHERE read_at IS NULL', [new Date().toISOString()])
      return result.rowCount ?? 0
    },
  }
}
