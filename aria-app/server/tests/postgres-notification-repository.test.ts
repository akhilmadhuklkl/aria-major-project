import assert from 'node:assert/strict'
import test from 'node:test'
import type { Pool } from 'pg'
import { createPostgresNotificationRepository } from '../repositories/postgres-notification-repository.js'

test('PostgreSQL notifications map IDs and timestamps and parameterize inputs', async () => {
  const calls: Array<{ sql: string; values: unknown[] }> = []
  const timestamp = '2026-01-01T00:00:00.000Z'
  const title = "A customer's notification"
  const query = async (sql: string, values: unknown[] = []) => {
    calls.push({ sql, values })
    return { rows: [{ id: '42', kind: 'test', title, message: 'Test', readAt: null, createdAt: new Date(timestamp) }], rowCount: 1 }
  }
  const repository = createPostgresNotificationRepository({ query } as unknown as Pick<Pool, 'query'>)
  const created = await repository.createNotification({ kind: 'test', title, message: 'Test' })
  assert.deepEqual(created, { id: 42, kind: 'test', title, message: 'Test', readAt: null, createdAt: timestamp })
  assert.equal(calls[0].sql.includes(title), false)
  assert.deepEqual(calls[0].values.slice(0, 3), ['test', title, 'Test'])
  assert.deepEqual(await repository.listNotifications(), [created])
  assert.deepEqual(calls.at(-1)?.values, [20])
  await repository.listNotifications(1000)
  assert.deepEqual(calls.at(-1)?.values, [100])
  assert.equal(await repository.markNotificationRead(42), true)
  assert.equal(calls.at(-1)?.values[1], 42)
  assert.equal(await repository.markAllNotificationsRead(), 1)
  assert.match(calls.at(-1)?.sql ?? '', /WHERE read_at IS NULL/)
})

test('PostgreSQL notifications report no affected rows and propagate database errors', async () => {
  const repository = createPostgresNotificationRepository({ query: async () => ({ rows: [], rowCount: 0 }) } as unknown as Pick<Pool, 'query'>)
  assert.equal(await repository.markNotificationRead(-1), false)
  assert.equal(await repository.markAllNotificationsRead(), 0)
  assert.deepEqual(await repository.listNotifications(), [])
  const failing = createPostgresNotificationRepository({ query: async () => { throw new Error('database unavailable') } } as unknown as Pick<Pool, 'query'>)
  await assert.rejects(failing.listNotifications(), /database unavailable/)
})
