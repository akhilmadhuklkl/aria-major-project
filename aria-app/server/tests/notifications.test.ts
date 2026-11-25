import assert from 'node:assert/strict'
import test from 'node:test'
import { db } from '../database.js'
import { sqliteNotificationRepository } from '../repositories/sqlite-notification-repository.js'

const { createNotification, listNotifications, markNotificationRead, markAllNotificationsRead } = sqliteNotificationRepository

test('notifications persist and can be marked read individually', () => {
  const notification = createNotification({
    kind: 'test',
    title: 'Test notification',
    message: 'Temporary notification for automated testing.',
  })

  try {
    const created = listNotifications().find((item) => Number((item as { id: number }).id) === notification.id) as { readAt: string | null } | undefined
    assert.ok(created)
    assert.equal(created.readAt, null)
    assert.equal(markNotificationRead(notification.id), true)
    const updated = listNotifications().find((item) => Number((item as { id: number }).id) === notification.id) as { readAt: string | null } | undefined
    assert.ok(updated?.readAt)
  } finally {
    db.prepare('DELETE FROM notifications WHERE id = ?').run(notification.id)
  }
})

test('mark all notifications read preserves existing timestamps and ignores missing ids', () => {
  db.exec('BEGIN')
  try {
    markAllNotificationsRead()
    const read = createNotification({ kind: 'test', title: 'Already read', message: 'Test' })
    markNotificationRead(read.id)
    const timestamp = (db.prepare('SELECT read_at FROM notifications WHERE id = ?').get(read.id) as { read_at: string }).read_at
    const unread = createNotification({ kind: 'test', title: 'Unread', message: 'Test' })
    assert.equal(Number(markAllNotificationsRead()), 1)
    assert.equal(Number(markAllNotificationsRead()), 0)
    assert.equal(markNotificationRead(-1), false)
    assert.equal((db.prepare('SELECT read_at FROM notifications WHERE id = ?').get(read.id) as { read_at: string }).read_at, timestamp)
    assert.ok((db.prepare('SELECT read_at FROM notifications WHERE id = ?').get(unread.id) as { read_at: string }).read_at)
  } finally {
    db.exec('ROLLBACK')
  }
})
