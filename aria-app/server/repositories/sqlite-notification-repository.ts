import { db } from '../database.js'
import type { NotificationRecord, NotificationRepository } from './notification-repository.js'

export const sqliteNotificationRepository: NotificationRepository = {
  createNotification(input) {
    const createdAt = new Date().toISOString()
    const result = db.prepare('INSERT INTO notifications (kind, title, message, created_at) VALUES (?, ?, ?, ?)')
      .run(input.kind, input.title, input.message, createdAt)
    return { id: Number(result.lastInsertRowid), ...input, readAt: null, createdAt }
  },
  listNotifications(limit = 20) {
    return db.prepare(`
      SELECT id, kind, title, message, read_at AS readAt, created_at AS createdAt
      FROM notifications ORDER BY created_at DESC LIMIT ?
    `).all(Math.max(1, Math.min(limit, 100))) as NotificationRecord[]
  },
  markNotificationRead(id) {
    return db.prepare('UPDATE notifications SET read_at = ? WHERE id = ?').run(new Date().toISOString(), id).changes > 0
  },
  markAllNotificationsRead() {
    return db.prepare('UPDATE notifications SET read_at = ? WHERE read_at IS NULL').run(new Date().toISOString()).changes
  },
}
