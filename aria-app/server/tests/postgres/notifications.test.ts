import assert from 'node:assert/strict'
import test from 'node:test'
import { Pool } from 'pg'
import { createPostgresNotificationRepository } from '../../repositories/postgres-notification-repository.js'
import { runNotificationRepositoryContract } from '../contracts/repository-contracts.js'

test('PostgreSQL notification lifecycle persists and updates read state', async () => {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required for PostgreSQL integration tests')
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10_000 })
  try {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      // A connection-local temporary table prevents the test from changing imported records.
      await client.query(`CREATE TEMP TABLE notifications (
        id BIGSERIAL PRIMARY KEY, kind TEXT NOT NULL, title TEXT NOT NULL, message TEXT NOT NULL,
        read_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL
      ) ON COMMIT DROP`)
      const repository = createPostgresNotificationRepository(client)
      await client.query('SAVEPOINT notification_repository_contract')
      try {
        await runNotificationRepositoryContract(repository, `postgres-notification-${Date.now()}`)
      } finally {
        await client.query('ROLLBACK TO SAVEPOINT notification_repository_contract')
        await client.query('RELEASE SAVEPOINT notification_repository_contract')
      }
      assert.deepEqual(await repository.listNotifications(), [])
      const first = await repository.createNotification({ kind: 'test', title: 'First', message: 'Integration test' })
      const second = await repository.createNotification({ kind: 'test', title: 'Second', message: 'Integration test' })
      assert.equal(typeof first.id, 'number')
      assert.equal(first.readAt, null)
      assert.ok(Number.isFinite(Date.parse(first.createdAt)))
      assert.equal((await repository.listNotifications()).length, 2)
      assert.equal((await repository.listNotifications(1)).length, 1)
      assert.equal(await repository.markNotificationRead(first.id), true)
      const readAt = (await repository.listNotifications()).find((item) => item.id === first.id)?.readAt
      assert.ok(readAt)
      assert.equal(await repository.markNotificationRead(-1), false)
      assert.equal(await repository.markAllNotificationsRead(), 1)
      const listed = await repository.listNotifications()
      assert.equal(listed.find((item) => item.id === first.id)?.readAt, readAt)
      assert.ok(listed.find((item) => item.id === second.id)?.readAt)
      assert.equal(await repository.markAllNotificationsRead(), 0)
    } finally {
      await client.query('ROLLBACK')
      client.release()
    }
  } finally { await pool.end() }
})
