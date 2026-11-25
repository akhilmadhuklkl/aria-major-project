import assert from 'node:assert/strict'
import test from 'node:test'
import { createPostgresRepositorySet, createRuntimeRepositories, type RuntimePool } from '../runtime-repositories.js'

function fakePool() {
  let ended = false
  const result = { command: 'SELECT', fields: [], oid: 0, rowCount: 0, rows: [] }
  const pool = {
    async query() { return result },
    async connect() { return { query: async () => result, release() {} } },
    async end() { ended = true },
  }
  return { pool: pool as unknown as RuntimePool, ended: () => ended }
}

test('runtime repository factory keeps SQLite explicit and does not create a PostgreSQL pool', async () => {
  const runtime = createRuntimeRepositories('sqlite')
  assert.deepEqual({ engine: runtime.engine, postgres: runtime.postgres }, { engine: 'sqlite', postgres: null })
  await assert.doesNotReject(runtime.close())
})

test('runtime repository factory requires a PostgreSQL URL', () => {
  assert.throws(() => createRuntimeRepositories('postgres', { databaseUrl: ' ' }), /DATABASE_URL is required/)
})

test('runtime repository factory assembles every PostgreSQL adapter and owns pool shutdown', async () => {
  const { pool, ended } = fakePool()
  const runtime = createRuntimeRepositories('postgres', { databaseUrl: 'postgresql://test.invalid/aria', pool })
  assert.equal(runtime.engine, 'postgres')
  assert.equal(runtime.pool, pool)
  assert.deepEqual(Object.keys(runtime.postgres).sort(), ['analytics', 'audit', 'auth', 'conversations', 'feedback', 'graph', 'knowledge', 'notifications', 'system', 'webhooks'])
  await runtime.close()
  assert.equal(ended(), true)
})

test('PostgreSQL repository set can be assembled independently for dependency injection', () => {
  const { pool } = fakePool()
  const repositories = createPostgresRepositorySet(pool)
  assert.equal(typeof repositories.system.verifyConnection, 'function')
  assert.equal(typeof repositories.graph.queryGraphPaths, 'function')
})
