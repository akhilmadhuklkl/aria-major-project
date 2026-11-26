import assert from 'node:assert/strict'
import test from 'node:test'
import { Pool } from 'pg'
import { createPostgresFeedbackRepository } from '../../repositories/postgres-feedback-repository.js'
import type { FeedbackRecord } from '../../repositories/feedback-repository.js'
import { runFeedbackRepositoryContract } from '../contracts/repository-contracts.js'

test('PostgreSQL feedback persists customer and agent fields and enforces constraints', async () => {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required for PostgreSQL integration tests')
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10_000 })
  try {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(`
        CREATE TEMP TABLE conversations (id BIGINT PRIMARY KEY) ON COMMIT DROP;
        CREATE TEMP TABLE messages (id TEXT PRIMARY KEY) ON COMMIT DROP;
        CREATE TEMP TABLE feedback (LIKE public.feedback INCLUDING ALL) ON COMMIT DROP;
        ALTER TABLE pg_temp.feedback ADD FOREIGN KEY (conversation_id) REFERENCES pg_temp.conversations(id);
        ALTER TABLE pg_temp.feedback ADD FOREIGN KEY (message_id) REFERENCES pg_temp.messages(id);
        INSERT INTO pg_temp.conversations VALUES (42);
        INSERT INTO pg_temp.messages VALUES ('test-message');
      `)
      const repository = createPostgresFeedbackRepository(client)
      const readFeedback = async (id: string): Promise<FeedbackRecord | undefined> => {
        const { rows } = await client.query('SELECT id, message_id AS "messageId", conversation_id AS "conversationId", rating, feedback_type AS "feedbackType", comment, edited_response AS "editedResponse", quality_score AS "qualityScore", created_at AS "createdAt" FROM pg_temp.feedback WHERE id = $1', [id])
        const row = rows[0] as Record<string, unknown> | undefined
        return row ? {
          id: String(row.id), messageId: String(row.messageId), conversationId: Number(row.conversationId),
          rating: row.rating === null || row.rating === undefined ? null : Number(row.rating), feedbackType: String(row.feedbackType),
          comment: row.comment === null || row.comment === undefined ? null : String(row.comment),
          editedResponse: row.editedResponse === null || row.editedResponse === undefined ? null : String(row.editedResponse),
          qualityScore: Number(row.qualityScore), createdAt: (row.createdAt as Date).toISOString(),
        } : undefined
      }
      await client.query('SAVEPOINT feedback_repository_contract')
      try {
        await runFeedbackRepositoryContract(repository, readFeedback, 42, 'test-message', `postgres-feedback-${Date.now()}`)
      } finally {
        await client.query('ROLLBACK TO SAVEPOINT feedback_repository_contract')
        await client.query('RELEASE SAVEPOINT feedback_repository_contract')
      }
      const createdAt = '2026-01-01T00:00:00.000Z'
      for (const feedbackType of ['customer_rating', 'accepted', 'edited', 'rejected']) {
        const entry = {
          id: crypto.randomUUID(), messageId: 'test-message', conversationId: 42, feedbackType,
          qualityScore: 75, createdAt,
          ...(feedbackType === 'customer_rating' ? { rating: 4, comment: "Customer's comment" } : {}),
          ...(feedbackType === 'edited' ? { editedResponse: 'Revised response' } : {}),
        }
        await repository.insertFeedback(entry)
        const { rows } = await client.query('SELECT * FROM pg_temp.feedback WHERE id = $1', [entry.id])
        assert.deepEqual({ ...rows[0], conversation_id: Number(rows[0].conversation_id), created_at: rows[0].created_at.toISOString() }, {
          id: entry.id, message_id: entry.messageId, conversation_id: 42, rating: entry.rating ?? null,
          feedback_type: feedbackType, comment: entry.comment ?? null, edited_response: entry.editedResponse ?? null,
          quality_score: 75, created_at: createdAt,
        })
      }
      const entry = { id: crypto.randomUUID(), messageId: 'test-message', conversationId: 42, feedbackType: 'accepted', qualityScore: 75, createdAt }
      await repository.insertFeedback(entry)
      for (const invalid of [entry, { ...entry, id: crypto.randomUUID(), messageId: 'missing' }, { ...entry, id: crypto.randomUUID(), conversationId: -1 }]) {
        await client.query('SAVEPOINT invalid_write')
        await assert.rejects(repository.insertFeedback(invalid))
        await client.query('ROLLBACK TO SAVEPOINT invalid_write')
        await client.query('RELEASE SAVEPOINT invalid_write')
      }
      const { rows } = await client.query('SELECT COUNT(*)::int AS count FROM pg_temp.feedback')
      assert.equal(rows[0].count, 5)
    } finally {
      await client.query('ROLLBACK')
      client.release()
    }
  } finally { await pool.end() }
})
