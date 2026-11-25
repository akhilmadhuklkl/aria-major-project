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
