import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import test from 'node:test'
import { createSqliteSystemRepository } from '../repositories/sqlite-system-repository.js'
import { checkDatabaseReadiness } from '../readiness.js'

test('system repository probes the database and returns accurate record counts', () => {
  const db = new DatabaseSync(':memory:')
  const repository = createSqliteSystemRepository(db)
  try {
    db.exec('CREATE TABLE conversations (id INTEGER); CREATE TABLE feedback (id INTEGER);')
    assert.doesNotThrow(() => repository.verifyConnection())
    assert.deepEqual(repository.getRecordCounts(), { conversations: 0, feedbackRecords: 0 })
    db.exec('INSERT INTO conversations VALUES (1), (2); INSERT INTO feedback VALUES (1);')
    assert.deepEqual(repository.getRecordCounts(), { conversations: 2, feedbackRecords: 1 })
  } finally { db.close() }
  assert.throws(() => repository.verifyConnection())
})

test('readiness checks the primary database even when Neo4j is configured', async () => {
  const calls: string[] = []
  const primary = { verifyConnection() { calls.push('primary') } }
  const graph = { async verifyConnection() { calls.push('graph') } }
  assert.deepEqual(await checkDatabaseReadiness('sqlite', primary), { ready: true, database: 'sqlite', graphStore: 'sqlite' })
  calls.length = 0
  assert.deepEqual(await checkDatabaseReadiness('sqlite', primary, graph), { ready: true, database: 'sqlite', graphStore: 'neo4j' })
  assert.deepEqual(calls, ['primary', 'graph'])
  calls.length = 0
  const failed = { verifyConnection() { throw new Error('private connection details') } }
  assert.deepEqual(await checkDatabaseReadiness('sqlite', failed, graph), { ready: false, database: 'sqlite', graphStore: 'neo4j' })
  assert.deepEqual(calls, [])
  assert.deepEqual(await checkDatabaseReadiness('sqlite', primary, { async verifyConnection() { throw new Error('graph unavailable') } }), { ready: false, database: 'sqlite', graphStore: 'neo4j' })
  assert.deepEqual(await checkDatabaseReadiness('sqlite', primary, { async verifyConnection() { return false } }), { ready: false, database: 'sqlite', graphStore: 'neo4j' })
})
