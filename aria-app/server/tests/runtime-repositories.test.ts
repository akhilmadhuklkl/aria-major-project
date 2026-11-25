import assert from 'node:assert/strict'
import test from 'node:test'
import { db } from '../database.js'
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
  assert.equal(typeof runtime.auth.findUserByEmail, 'function')
  assert.equal(typeof runtime.conversations.listConversationPage, 'function')
  assert.equal(typeof runtime.feedback.insertFeedback, 'function')
  assert.equal(typeof runtime.notifications.listNotifications, 'function')
  assert.equal(typeof runtime.audit.listAuditLogs, 'function')
  assert.equal(typeof runtime.knowledge.listKnowledge, 'function')
  assert.equal(typeof runtime.system.verifyConnection, 'function')
  assert.equal(typeof runtime.system.getRecordCounts, 'function')
  await runtime.system.verifyConnection()
  await assert.doesNotReject(runtime.close())
})

test('runtime repository factory requires a PostgreSQL URL', () => {
  assert.throws(() => createRuntimeRepositories('postgres', { databaseUrl: ' ' }), /DATABASE_URL is required/)
})

test('runtime repository factory assembles every PostgreSQL adapter and owns pool shutdown', async () => {
  const { pool, ended } = fakePool()
  const runtime = createRuntimeRepositories('postgres', { databaseUrl: 'postgresql://test.invalid/aria', pool })
  assert.equal(runtime.engine, 'postgres')
  assert.equal(runtime.auth, runtime.postgres.auth)
  assert.equal(runtime.conversations, runtime.postgres.conversations)
  assert.equal(runtime.feedback, runtime.postgres.feedback)
  assert.equal(runtime.notifications, runtime.postgres.notifications)
  assert.equal(runtime.audit, runtime.postgres.audit)
  assert.equal(runtime.knowledge, runtime.postgres.knowledge)
  assert.equal(runtime.system, runtime.postgres.system)
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

test('async runtime knowledge adapter preserves SQLite lifecycle and embeddings', async () => {
  const runtime = createRuntimeRepositories('sqlite')
  const title = `Runtime knowledge ${Date.now()}`
  const document = await runtime.knowledge.createKnowledgeDocument({
    title,
    category: 'Test',
    content: 'Runtime repository content',
  })

  try {
    assert.equal((await runtime.knowledge.listKnowledge()).find((item) => item.id === document.id)?.title, title)
    await runtime.knowledge.upsertKnowledgeEmbedding({
      knowledgeDocumentId: document.id,
      model: 'runtime-test-model',
      vector: [1, 0],
      contentHash: 'runtime-test-hash',
    })
    assert.equal((await runtime.knowledge.listEmbeddedKnowledge()).find((item) => item.id === document.id)?.model, 'runtime-test-model')
    assert.equal((await runtime.knowledge.archiveKnowledgeDocuments([document.id])).archived, 1)
    assert.equal((await runtime.knowledge.listKnowledge()).some((item) => item.id === document.id), false)
  } finally {
    db.prepare('DELETE FROM knowledge_documents WHERE id = ?').run(document.id)
    await runtime.close()
  }
})
