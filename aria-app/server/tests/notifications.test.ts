import assert from 'node:assert/strict'
import test from 'node:test'
import { createNotification, db, listNotifications, markNotificationRead } from '../database.js'

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
