import assert from 'node:assert/strict'
import test from 'node:test'
import type { Pool } from 'pg'
import { createPostgresConversationRepository } from '../repositories/postgres-conversation-repository.js'

test('PostgreSQL conversation updates bind partial fields, explicit clears, and JSON arrays', async () => {
  const calls: Array<{ sql: string; values: unknown[] }> = []
  const query = async (sql: string, values: unknown[]) => { calls.push({ sql, values }); return { rows: [], rowCount: 0 } }
  const repository = createPostgresConversationRepository({ query } as unknown as Pick<Pool, 'query'>)
  assert.equal(await repository.updateConversation(42, { status: 'pending', assignedTo: undefined }), undefined)
  assert.deepEqual(calls[0].values.slice(0, 7), ['pending', null, null, false, null, null, null])
  await repository.updateConversation(42, { assignedTo: null, tags: [], escalated: false })
  assert.deepEqual(calls[1].values.slice(0, 7), [null, null, null, true, null, '[]', false])
  const message = { id: 'message', conversationId: 42, role: 'assistant', content: "Customer's answer", confidence: 0, sources: ['Policy'], sourceScores: [{ title: 'Policy', score: 0.8 }], latencyMs: 0, shouldEscalate: false, createdAt: new Date().toISOString() }
  assert.equal(await repository.appendMessage(message), message)
  assert.equal(calls[2].sql.includes(message.content), false)
  assert.deepEqual(calls[2].values.slice(3, 7), [message.content, 0, '["Policy"]', '[{"title":"Policy","score":0.8}]'])
  assert.equal(calls[2].values[9], 0)
})

test('PostgreSQL conversation repository returns missing identities and propagates failures', async () => {
  const repository = createPostgresConversationRepository({ query: async () => ({ rows: [] }) } as unknown as Pick<Pool, 'query'>)
  assert.equal(await repository.getConversation(-1), undefined)
  assert.equal(await repository.getCustomerContext(-1), undefined)
  assert.equal(await repository.getLatestAssistantMessageId(-1), undefined)
  assert.deepEqual(await repository.listMessages(-1), [])
  const failing = createPostgresConversationRepository({ query: async () => { throw new Error('database unavailable') } } as unknown as Pick<Pool, 'query'>)
  await assert.rejects(failing.listConversations(), /database unavailable/)
})
