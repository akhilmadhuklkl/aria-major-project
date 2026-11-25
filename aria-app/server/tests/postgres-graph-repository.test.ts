import assert from 'node:assert/strict'
import test from 'node:test'
import type { Pool } from 'pg'
import { createPostgresGraphRepository } from '../repositories/postgres-graph-repository.js'

test('PostgreSQL graph repository serializes properties, bounds limits, and parameterizes deletes', async () => {
  const calls: Array<{ sql: string; values: unknown[] }> = []
  const query = async (sql: string, values: unknown[] = []) => {
    calls.push({ sql, values })
    if (sql.includes('INSERT INTO graph_nodes')) return { rows: [{ id: 'a', type: 'Customer', properties: { active: false, count: 0 }, createdAt: new Date('2026-01-01T00:00:00.000Z'), updatedAt: new Date('2026-01-01T00:00:00.000Z') }], rowCount: 1 }
    if (sql.startsWith('DELETE FROM graph_nodes')) return { rows: [], rowCount: 1 }
    return { rows: [], rowCount: 0 }
  }
  const repository = createPostgresGraphRepository({ query } as unknown as Pick<Pool, 'query'>)
  const node = await repository.upsertGraphNode({ id: 'a', type: 'Customer', properties: { active: false, count: 0 } })
  assert.deepEqual(node?.properties, { active: false, count: 0 })
  assert.deepEqual(calls[0].values.slice(0, 3), ['a', 'Customer', '{"active":false,"count":0}'])
  assert.equal(await repository.deleteGraphNode('a'), true)
  assert.deepEqual(calls[1].values, ['a'])
  assert.equal(await repository.deleteGraphRelationship({ sourceId: 'a', type: 'OWNS', targetId: 'b' }), false)
})

test('PostgreSQL graph repository propagates database failures', async () => {
  const error = new Error('database unavailable')
  const repository = createPostgresGraphRepository({ query: async () => { throw error } } as unknown as Pick<Pool, 'query'>)
  await assert.rejects(repository.getGraphNode('missing'), (actual) => actual === error)
  await assert.rejects(repository.findGraphKnowledgeTitles('refund'), (actual) => actual === error)
})
