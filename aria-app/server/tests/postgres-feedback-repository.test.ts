import assert from 'node:assert/strict'
import test from 'node:test'
import type { Pool } from 'pg'
import { createPostgresFeedbackRepository } from '../repositories/postgres-feedback-repository.js'

test('PostgreSQL feedback uses bound parameters and preserves nullable and zero-valued fields', async () => {
  const calls: Array<{ sql: string; values: unknown[] }> = []
  const query = async (sql: string, values: unknown[]) => {
    calls.push({ sql, values })
    return { rows: [], rowCount: 1 }
  }
  const repository = createPostgresFeedbackRepository({ query } as unknown as Pick<Pool, 'query'>)
  const base = { id: 'feedback-id', messageId: 'message-id', conversationId: 42, feedbackType: 'customer_rating', qualityScore: 0, createdAt: '2026-01-01T00:00:00.000Z' }
  const comment = "Customer's comment: '); DROP TABLE feedback; --"
  await repository.insertFeedback({ ...base, rating: 0, comment, editedResponse: '' })
  assert.deepEqual(calls[0].values, [base.id, base.messageId, 42, 0, 'customer_rating', comment, '', 0, base.createdAt])
  assert.equal(calls[0].sql.includes(comment), false)
  assert.match(calls[0].sql, /\$9/)
  for (const feedbackType of ['accepted', 'edited', 'rejected']) {
    await repository.insertFeedback({ ...base, feedbackType })
    assert.deepEqual(calls.at(-1)?.values, [base.id, base.messageId, 42, null, feedbackType, null, null, 0, base.createdAt])
  }
})

test('PostgreSQL feedback propagates constraint and connection errors', async () => {
  const error = new Error('database rejected the write')
  const repository = createPostgresFeedbackRepository({ query: async () => { throw error } } as unknown as Pick<Pool, 'query'>)
  await assert.rejects(repository.insertFeedback({ id: 'id', messageId: 'missing', conversationId: 1, feedbackType: 'accepted', qualityScore: 75, createdAt: new Date().toISOString() }), (actual) => actual === error)
})
