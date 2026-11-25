import assert from 'node:assert/strict'
import test from 'node:test'
import type { Pool } from 'pg'
import { createPostgresAuditRepository } from '../repositories/postgres-audit-repository.js'

test('PostgreSQL audit writes parameterize metadata and retain defaults and zero IDs', async () => {
  const calls: Array<{ sql: string; values: unknown[] }> = []
  const query = async (sql: string, values: unknown[]) => {
    calls.push({ sql, values })
    return { rows: [{ id: '12' }], rowCount: 1 }
  }
  const repository = createPostgresAuditRepository({ query } as unknown as Pick<Pool, 'query'>)
  const metadata = { name: "Customer's integration", active: false, count: 0, events: ['knowledge.indexed'] }
  const entry = await repository.createAuditLog({ action: 'webhook.paused', entityType: 'webhook', entityId: 0, metadata })
  assert.equal(entry.id, 12)
  assert.deepEqual(entry.metadata, metadata)
  assert.deepEqual(calls[0].values, [null, 'local-demo', 'webhook.paused', 'webhook', '0', JSON.stringify(metadata), entry.createdAt])
  assert.equal(calls[0].sql.includes(metadata.name), false)
  await repository.createAuditLog({ actorUserId: 7, actorEmail: 'agent@example.com', action: 'test', entityType: 'test' })
  assert.deepEqual(calls[1].values.slice(0, 6), [7, 'agent@example.com', 'test', 'test', null, '{}'])
})

test('PostgreSQL audit reads map numeric IDs, JSONB, timestamps, and list limits', async () => {
  const metadata = { nested: { values: ['a', 'b'] } }
  const timestamp = '2026-01-01T00:00:00.000Z'
  const values: unknown[][] = []
  const row = { id: '12', actorUserId: '7', actorEmail: 'agent@example.com', action: 'test', entityType: 'test', entityId: '0', metadata, createdAt: new Date(timestamp) }
  const query = async (_sql: string, params: unknown[]) => { values.push(params); return { rows: [row], rowCount: 1 } }
  const repository = createPostgresAuditRepository({ query } as unknown as Pick<Pool, 'query'>)
  assert.deepEqual(await repository.listAuditLogs(), [{ ...row, id: 12, actorUserId: 7, createdAt: timestamp }])
  await repository.listAuditLogs(500)
  await repository.listAuditLogs(0)
  assert.deepEqual(values, [[50], [100], [1]])
})

test('PostgreSQL audit propagates read and write failures', async () => {
  const repository = createPostgresAuditRepository({ query: async () => { throw new Error('database unavailable') } } as unknown as Pick<Pool, 'query'>)
  await assert.rejects(repository.listAuditLogs(), /database unavailable/)
  await assert.rejects(repository.createAuditLog({ action: 'test', entityType: 'test' }), /database unavailable/)
})
