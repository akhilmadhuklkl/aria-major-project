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

test('partial conversation updates ignore undefined fields and preserve explicit clears', () => {
  db.exec('BEGIN')
  try {
    const now = new Date().toISOString()
    const conversation = sqliteConversationRepository.createConversation({
      customerName: 'Partial Update Test', subject: 'Preserve metadata',
      status: 'open', priority: 'high', topic: 'Refunds', assignedTo: 'Support Agent',
      tags: ['refund'], escalated: true, createdAt: now, updatedAt: now,
    })
    const updated = sqliteConversationRepository.updateConversation(conversation.id, {
      status: 'pending', priority: undefined, topic: undefined,
      assignedTo: undefined, tags: undefined, escalated: undefined,
    })
    assert.ok(updated)
    assert.equal(updated.status, 'pending')
    assert.equal(updated.priority, 'high')
    assert.equal(updated.topic, 'Refunds')
    assert.equal(updated.assignedTo, 'Support Agent')
    assert.deepEqual(updated.tags, ['refund'])
    assert.equal(updated.escalated, true)

    const cleared = sqliteConversationRepository.updateConversation(conversation.id, {
      assignedTo: null, tags: [], escalated: false,
    })
    assert.ok(cleared)
    assert.equal(cleared.assignedTo, null)
    assert.deepEqual(cleared.tags, [])
    assert.equal(cleared.escalated, false)
    assert.equal(cleared.status, 'pending')
    assert.equal(cleared.priority, 'high')
  } finally {
    db.exec('ROLLBACK')
  }
})
