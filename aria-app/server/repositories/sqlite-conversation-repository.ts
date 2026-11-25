import { db } from '../database.js'
import type { ConversationRecord, ConversationRepository } from './conversation-repository.js'

function mapConversation(row: Record<string, unknown>) {
  return {
    id: Number(row.id),
    customerName: String(row.customerName ?? row.customer_name),
    subject: String(row.subject),
    status: String(row.status) as ConversationRecord['status'],
    priority: String(row.priority) as ConversationRecord['priority'],
    topic: String(row.topic),
    assignedTo: row.assignedTo === undefined ? (row.assigned_to as string | null | undefined) : row.assignedTo as string | null,
    tags: typeof row.tags === 'string' ? JSON.parse(row.tags) as string[] : (row.tags as string[] ?? []),
    escalated: Boolean(row.escalated),
    createdAt: String(row.createdAt ?? row.created_at),
    updatedAt: String(row.updatedAt ?? row.updated_at),
  }
}

function mapMessage(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    conversationId: Number(row.conversationId ?? row.conversation_id),
    role: String(row.role),
    content: String(row.content),
    confidence: row.confidence === null || row.confidence === undefined ? null : Number(row.confidence),
    sources: typeof row.sources === 'string' ? JSON.parse(row.sources) as string[] : (row.sources as string[] | null | undefined),
    sourceScores: typeof row.sourceScores === 'string' ? JSON.parse(row.sourceScores) as Record<string, unknown>[] : (row.sourceScores as Record<string, unknown>[] | null | undefined),
    retrievalMethod: row.retrievalMethod === undefined ? row.retrieval_method as string | null : row.retrievalMethod as string | null,
    generationProvider: row.generationProvider === undefined ? row.generation_provider as string | null : row.generationProvider as string | null,
    latencyMs: row.latencyMs === undefined ? row.latency_ms as number | null : row.latencyMs as number | null,
    shouldEscalate: Boolean(row.shouldEscalate ?? row.should_escalate),
    createdAt: String(row.createdAt ?? row.created_at),
  }
}

export const sqliteConversationRepository: ConversationRepository = {
  createConversation(input) {
    const result = db.prepare(`
      INSERT INTO conversations (customer_name, subject, status, priority, topic, assigned_to, tags, escalated, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(input.customerName, input.subject, input.status, input.priority, input.topic, input.assignedTo ?? null, JSON.stringify(input.tags), input.escalated ? 1 : 0, input.createdAt, input.updatedAt)
    return this.getConversation(Number(result.lastInsertRowid)) as ConversationRecord
  },

  getConversation(id) {
    const row = db.prepare('SELECT id, customer_name AS customerName, subject, status, priority, topic, assigned_to AS assignedTo, tags, escalated, created_at AS createdAt, updated_at AS updatedAt FROM conversations WHERE id = ?').get(id) as Record<string, unknown> | undefined
    return row ? mapConversation(row) : undefined
  },

  updateConversation(id, changes) {
    const current = this.getConversation(id)
    if (!current) return undefined
    const next = { ...current, ...changes, updatedAt: new Date().toISOString() }
    db.prepare('UPDATE conversations SET status = ?, priority = ?, topic = ?, assigned_to = ?, tags = ?, escalated = ?, updated_at = ? WHERE id = ?')
      .run(next.status, next.priority, next.topic, next.assignedTo ?? null, JSON.stringify(next.tags), next.escalated ? 1 : 0, next.updatedAt, id)
    return this.getConversation(id)
  },

  appendMessage(message) {
    db.prepare(`
      INSERT INTO messages (id, conversation_id, role, content, confidence, sources, source_scores, retrieval_method, generation_provider, latency_ms, should_escalate, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(message.id, message.conversationId, message.role, message.content, message.confidence ?? null, message.sources ? JSON.stringify(message.sources) : null, message.sourceScores ? JSON.stringify(message.sourceScores) : null, message.retrievalMethod ?? null, message.generationProvider ?? null, message.latencyMs ?? null, message.shouldEscalate ? 1 : 0, message.createdAt)
    return message
  },

  listMessages(conversationId) {
    return db.prepare('SELECT id, conversation_id AS conversationId, role, content, confidence, sources, source_scores AS sourceScores, retrieval_method AS retrievalMethod, generation_provider AS generationProvider, latency_ms AS latencyMs, should_escalate AS shouldEscalate, created_at AS createdAt FROM messages WHERE conversation_id = ? ORDER BY created_at ASC').all(conversationId).map((row) => mapMessage(row as Record<string, unknown>))
  },

  getCustomerContext(conversationId) {
    const conversation = this.getConversation(conversationId)
    if (!conversation) return undefined
    const counts = db.prepare("SELECT COUNT(*) AS totalConversations, COALESCE(SUM(CASE WHEN status IN ('open', 'pending') THEN 1 ELSE 0 END), 0) AS openConversations FROM conversations WHERE customer_name = ?").get(conversation.customerName) as { totalConversations: number; openConversations: number }
    const topics = db.prepare('SELECT topic, COUNT(*) AS count FROM conversations WHERE customer_name = ? GROUP BY topic ORDER BY count DESC, topic ASC LIMIT 5').all(conversation.customerName) as Array<{ topic: string; count: number }>
    const history = db.prepare('SELECT id, customer_name AS customerName, subject, status, priority, topic, assigned_to AS assignedTo, tags, escalated, created_at AS createdAt, updated_at AS updatedAt, (SELECT content FROM messages WHERE conversation_id = conversations.id ORDER BY created_at DESC LIMIT 1) AS lastMessage FROM conversations WHERE customer_name = ? AND id != ? ORDER BY updated_at DESC LIMIT 5').all(conversation.customerName, conversationId).map((row) => ({ ...mapConversation(row as Record<string, unknown>), lastMessage: (row as Record<string, unknown>).lastMessage as string | null }))
    return { customer: conversation.customerName, ...counts, topics, history }
  },
}
