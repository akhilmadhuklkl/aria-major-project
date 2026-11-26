import assert from 'node:assert/strict'
import test from 'node:test'
import type { Pool } from 'pg'
import { createPostgresKnowledgeRepository } from '../repositories/postgres-knowledge-repository.js'

test('PostgreSQL knowledge upserts JSON vectors and filters invalid bulk IDs', async () => {
  const calls: Array<{ sql: string; values: unknown[] }> = []
  const query = async (sql: string, values: unknown[]) => { calls.push({ sql, values }); return { rows: [], rowCount: 1 } }
  const repository = createPostgresKnowledgeRepository({ query } as unknown as Pick<Pool, 'query' | 'connect'>)
  await repository.upsertKnowledgeEmbedding({ knowledgeDocumentId: 3, model: 'test-model', vector: [0.5, -1], contentHash: 'hash' })
  assert.deepEqual(calls[0].values.slice(0, 5), [3, 'test-model', 2, '[0.5,-1]', 'hash'])
  assert.deepEqual(await repository.deleteKnowledgeDocuments([3, 3, 0, -1, 2.5, Infinity, Number.MAX_SAFE_INTEGER + 1]), { deleted: 1 })
  assert.deepEqual(calls[1].values, [[3]])
  assert.deepEqual(await repository.archiveKnowledgeDocuments([]), { archived: 0 })
  assert.deepEqual(await repository.restoreKnowledgeDocuments([-1]), { restored: 0 })
  assert.equal(calls.length, 2)
})

test('PostgreSQL knowledge persists a document, version, and embedding in one transaction', async () => {
  const statements: string[] = []
  const timestamp = '2026-01-01T00:00:00.000Z'
  const client = {
    async query(sql: string) {
      const statement = sql.trim().split(/\s+/).slice(0, 3).join(' ')
      statements.push(statement)
      if (statement === 'INSERT INTO knowledge_documents') {
        return {
          rows: [{ id: '3', title: 'Atomic policy', category: 'FAQ', content: 'Text', status: 'indexed', uses: 0, updatedAt: timestamp, archivedAt: null }],
          rowCount: 1,
        }
      }
      return { rows: [], rowCount: 1 }
    },
    release() {},
  }
  const repository = createPostgresKnowledgeRepository({ connect: async () => client } as unknown as Pick<Pool, 'query' | 'connect'>)

  const document = await repository.createKnowledgeDocumentWithEmbedding(
    { title: 'Atomic policy', category: 'FAQ', content: 'Text' },
    { model: 'test-model', vector: [1, 0], contentHash: 'hash' },
  )
  assert.equal(document.id, 3)
  assert.deepEqual(statements, [
    'BEGIN ISOLATION LEVEL',
    'INSERT INTO knowledge_documents',
    'INSERT INTO knowledge_document_versions',
    'INSERT INTO knowledge_embeddings',
    'COMMIT',
  ])
})

test('PostgreSQL knowledge rolls back atomic indexing when embedding persistence fails', async () => {
  const statements: string[] = []
  const failure = new Error('embedding insert failed')
  const client = {
    async query(sql: string) {
      const statement = sql.trim().split(/\s+/).slice(0, 3).join(' ')
      statements.push(statement)
      if (statement === 'INSERT INTO knowledge_embeddings') throw failure
      return { rows: [{ id: '3', title: 'Atomic policy', category: 'FAQ', content: 'Text', status: 'indexed', uses: 0, updatedAt: '2026-01-01T00:00:00.000Z', archivedAt: null }], rowCount: 1 }
    },
    release() {},
  }
  const repository = createPostgresKnowledgeRepository({ connect: async () => client } as unknown as Pick<Pool, 'query' | 'connect'>)

  await assert.rejects(
    repository.createKnowledgeDocumentWithEmbedding(
      { title: 'Atomic policy', category: 'FAQ', content: 'Text' },
      { model: 'test-model', vector: [1, 0], contentHash: 'hash' },
    ),
    (error) => error === failure,
  )
  assert.deepEqual(statements, [
    'BEGIN ISOLATION LEVEL',
    'INSERT INTO knowledge_documents',
    'INSERT INTO knowledge_document_versions',
    'INSERT INTO knowledge_embeddings',
    'ROLLBACK',
  ])
})

test('PostgreSQL knowledge rolls back failed version writes and discards a client if rollback fails', async () => {
  for (const failRollback of [false, true]) {
    const statements: string[] = []
    const releases: boolean[] = []
    const failure = new Error('version insert failed')
    const client = {
      async query(sql: string) {
        const statement = sql.trim().split(/\s+/).slice(0, 3).join(' ')
        statements.push(statement)
        if (statement === 'INSERT INTO knowledge_document_versions') throw failure
        if (statement === 'ROLLBACK' && failRollback) throw new Error('connection lost')
        return { rows: [{ id: '3' }] }
      },
      release(discard: boolean) { releases.push(discard) },
    }
    const repository = createPostgresKnowledgeRepository({ connect: async () => client } as unknown as Pick<Pool, 'query' | 'connect'>)
    await assert.rejects(repository.createKnowledgeDocument({ title: 'Test', category: 'FAQ', content: 'Text' }), (error) => error === failure)
    assert.deepEqual(statements, ['BEGIN ISOLATION LEVEL', 'INSERT INTO knowledge_documents', 'INSERT INTO knowledge_document_versions', 'ROLLBACK'])
    assert.deepEqual(releases, [failRollback])
  }
})
