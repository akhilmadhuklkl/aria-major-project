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

test('conversation pages search metadata, paginate, and retain global queue counts', () => {
  db.exec('BEGIN')
  try {
    const marker = crypto.randomUUID()
    const before = sqliteConversationRepository.listConversationPage(1, 0, '').queueCounts
    for (let index = 0; index < 3; index += 1) {
      sqliteConversationRepository.createConversation({
        customerName: index === 0 ? marker : 'Page Test Customer',
        subject: index === 1 ? marker : 'Page Test',
        tags: index === 2 ? [marker] : [], status: 'open', priority: 'normal', topic: 'General',
        assignedTo: index === 0 ? 'Agent' : null, escalated: false,
        createdAt: `2026-01-0${index + 1}T00:00:00.000Z`, updatedAt: `2026-01-0${index + 1}T00:00:00.000Z`,
      })
    }
    const first = sqliteConversationRepository.listConversationPage(2, 0, marker)
    const second = sqliteConversationRepository.listConversationPage(2, 2, marker)
    assert.equal(first.total, 3)
    assert.equal(first.items.length, 2)
    assert.equal(second.items.length, 1)
    assert.equal(new Set([...first.items, ...second.items].map((item) => item.id)).size, 3)
    assert.ok(first.items[0].updatedAt > first.items[1].updatedAt)
    assert.deepEqual({ ...first.queueCounts }, { mine: before.mine + 1, unassigned: before.unassigned + 2, attention: before.attention + 3 })
    assert.deepEqual(second.queueCounts, first.queueCounts)
    assert.equal(sqliteConversationRepository.listConversationPage(2, 0, crypto.randomUUID()).total, 0)
    assert.ok(sqliteConversationRepository.listConversations().some((item) => item.customerName === marker))
  } finally {
    db.exec('ROLLBACK')
  }
})

test('latest assistant lookup is conversation-scoped and ignores newer customer messages', () => {
  db.exec('BEGIN')
  try {
    const now = new Date().toISOString()
    const create = () => sqliteConversationRepository.createConversation({
      customerName: 'Assistant Lookup Test', subject: 'Latest assistant', status: 'open',
      priority: 'normal', topic: 'General', tags: [], escalated: false, createdAt: now, updatedAt: now,
    })
    const first = create()
    const other = create()
    assert.equal(sqliteConversationRepository.getLatestAssistantMessageId(first.id), undefined)
    const latestId = crypto.randomUUID()
    for (const [conversationId, role, id, createdAt] of [
      [first.id, 'assistant', crypto.randomUUID(), '2026-01-01T00:00:00.000Z'],
      [first.id, 'assistant', latestId, '2026-01-02T00:00:00.000Z'],
      [first.id, 'customer', crypto.randomUUID(), '2026-01-03T00:00:00.000Z'],
      [other.id, 'assistant', crypto.randomUUID(), '2026-01-04T00:00:00.000Z'],
    ] as const) {
      sqliteConversationRepository.appendMessage({ id, conversationId, role, content: 'Test', shouldEscalate: false, createdAt })
    }
    assert.equal(sqliteConversationRepository.getLatestAssistantMessageId(first.id), latestId)
    assert.equal(sqliteConversationRepository.getLatestAssistantMessageId(-1), undefined)
  } finally {
    db.exec('ROLLBACK')
  }
})
