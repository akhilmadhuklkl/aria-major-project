import assert from 'node:assert/strict'
import test from 'node:test'
import { db } from '../database.js'
import { sqliteConversationRepository } from '../repositories/sqlite-conversation-repository.js'

test('conversation repository preserves conversation and message fields', () => {
  db.exec('BEGIN')
  try {
    const now = new Date().toISOString()
    const conversation = sqliteConversationRepository.createConversation({
      customerName: 'Repository Test Customer',
      subject: 'Repository contract test',
      status: 'open',
      priority: 'normal',
      topic: 'General',
      assignedTo: null,
      tags: ['test'],
      escalated: false,
      createdAt: now,
      updatedAt: now,
    })
    const message = sqliteConversationRepository.appendMessage({
      id: `repository-test-${Date.now()}`,
      conversationId: conversation.id,
      role: 'assistant',
      content: 'Repository response',
      confidence: 0.91,
      sources: ['Test policy'],
      sourceScores: [{ title: 'Test policy', score: 0.91 }],
      retrievalMethod: 'hybrid',
      generationProvider: 'local-knowledge',
      latencyMs: 12,
      shouldEscalate: false,
      createdAt: now,
    })

    assert.equal(sqliteConversationRepository.getConversation(conversation.id)?.subject, 'Repository contract test')
    assert.deepEqual(sqliteConversationRepository.listMessages(conversation.id), [message])
    assert.equal(sqliteConversationRepository.updateConversation(conversation.id, { status: 'pending', escalated: true })?.status, 'pending')
    assert.equal(sqliteConversationRepository.getCustomerContext(conversation.id)?.customer, 'Repository Test Customer')
  } finally {
    db.exec('ROLLBACK')
  }
})
