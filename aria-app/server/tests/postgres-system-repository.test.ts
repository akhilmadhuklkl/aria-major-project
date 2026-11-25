import assert from 'node:assert/strict'
import test from 'node:test'
import type { Pool } from 'pg'
import { createPostgresSystemRepository } from '../repositories/postgres-system-repository.js'

test('PostgreSQL system repository probes connectivity and maps numeric counts', async () => {
  const calls: Array<{ sql: string; values: unknown[] }> = []
  const query = async (sql: string, values: unknown[] = []) => {
    calls.push({ sql, values })
    if (sql.includes('FROM conversations')) return { rows: [{ count: '4' }], rowCount: 1 }
    if (sql.includes('FROM feedback')) return { rows: [{ count: '7' }], rowCount: 1 }
    return { rows: [{ '?column?': 1 }], rowCount: 1 }
  }
  const repository = createPostgresSystemRepository({ query } as unknown as Pick<Pool, 'query'>)
  await repository.verifyConnection()
  assert.deepEqual(await repository.getRecordCounts(), { conversations: 4, feedbackRecords: 7 })
  assert.equal(calls[0].sql, 'SELECT 1')
  assert.deepEqual(calls[0].values, [])
})

test('PostgreSQL system repository propagates connection and count failures', async () => {
  const error = new Error('database unavailable')
  const repository = createPostgresSystemRepository({ query: async () => { throw error } } as unknown as Pick<Pool, 'query'>)
  await assert.rejects(repository.verifyConnection(), (actual) => actual === error)
  await assert.rejects(repository.getRecordCounts(), (actual) => actual === error)
})
