import type { Pool, PoolClient } from 'pg'
import type { AsyncConversationRepository, ConversationRecord, MessageRecord } from './conversation-repository.js'

type ConversationRow = Omit<ConversationRecord, 'id' | 'createdAt' | 'updatedAt'> & {
  id: string | number; createdAt: Date | string; updatedAt: Date | string
}
type MessageRow = Omit<MessageRecord, 'conversationId' | 'createdAt'> & { conversationId: string | number; createdAt: Date | string }
const columns = 'id, customer_name AS "customerName", subject, status, priority, topic, assigned_to AS "assignedTo", tags, escalated, created_at AS "createdAt", updated_at AS "updatedAt"'
const mapConversation = (row: ConversationRow): ConversationRecord => ({ ...row, id: Number(row.id), createdAt: new Date(row.createdAt).toISOString(), updatedAt: new Date(row.updatedAt).toISOString() })

export function createPostgresConversationRepository(client: Pick<Pool | PoolClient, 'query'>): AsyncConversationRepository {
  async function getConversation(id: number) {
    const result = await client.query<ConversationRow>(`SELECT ${columns} FROM conversations WHERE id = $1`, [id])
    return result.rows[0] ? mapConversation(result.rows[0]) : undefined
  }
  return {
    getConversation,
    async listConversations() {
      const result = await client.query<ConversationRow>(`SELECT ${columns} FROM conversations ORDER BY updated_at DESC`)
      return result.rows.map(mapConversation)
    },
    async listConversationPage(limit, offset, search) {
      const clause = search ? ' WHERE customer_name ILIKE $1 OR subject ILIKE $2 OR tags::text ILIKE $3' : ''
      const args = search ? [`%${search}%`, `%${search}%`, `%${search}%`] : []
      const total = await client.query<{ count: string }>(`SELECT COUNT(*) AS count FROM conversations${clause}`, args)
      const queues = await client.query<{ mine: string; unassigned: string; attention: string }>(`
        SELECT COUNT(*) FILTER (WHERE assigned_to IS NOT NULL AND assigned_to != '') AS mine,
          COUNT(*) FILTER (WHERE assigned_to IS NULL OR assigned_to = '') AS unassigned,
          COUNT(*) FILTER (WHERE status IN ('open', 'pending') OR escalated) AS attention
        FROM conversations
      `)
      const items = await client.query<ConversationRow>(`SELECT ${columns} FROM conversations${clause} ORDER BY updated_at DESC LIMIT $${args.length + 1} OFFSET $${args.length + 2}`, [...args, limit, offset])
      const queue = queues.rows[0]
      return { items: items.rows.map(mapConversation), total: Number(total.rows[0].count), queueCounts: { mine: Number(queue.mine), unassigned: Number(queue.unassigned), attention: Number(queue.attention) } }
    },
    async createConversation(input) {
      const result = await client.query<ConversationRow>(`
        INSERT INTO conversations (customer_name, subject, status, priority, topic, assigned_to, tags, escalated, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING ${columns}
      `, [input.customerName, input.subject, input.status, input.priority, input.topic, input.assignedTo ?? null, JSON.stringify(input.tags), input.escalated, input.createdAt, input.updatedAt])
      return mapConversation(result.rows[0])
    },
    async updateConversation(id, changes) {
      const result = await client.query<ConversationRow>(`
        UPDATE conversations SET status = COALESCE($1, status), priority = COALESCE($2, priority),
          topic = COALESCE($3, topic), assigned_to = CASE WHEN $4 THEN $5 ELSE assigned_to END,
          tags = COALESCE($6::jsonb, tags), escalated = COALESCE($7, escalated), updated_at = $8
        WHERE id = $9 RETURNING ${columns}
      `, [changes.status ?? null, changes.priority ?? null, changes.topic ?? null, changes.assignedTo !== undefined,
        changes.assignedTo ?? null, changes.tags === undefined ? null : JSON.stringify(changes.tags),
        changes.escalated ?? null, new Date().toISOString(), id])
      return result.rows[0] ? mapConversation(result.rows[0]) : undefined
    },
    async appendMessage(message) {
      await client.query(`
        INSERT INTO messages (id, conversation_id, role, content, confidence, sources, source_scores, retrieval_method, generation_provider, latency_ms, should_escalate, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [message.id, message.conversationId, message.role, message.content, message.confidence ?? null,
        message.sources ? JSON.stringify(message.sources) : null, message.sourceScores ? JSON.stringify(message.sourceScores) : null,
        message.retrievalMethod ?? null, message.generationProvider ?? null, message.latencyMs ?? null, message.shouldEscalate, message.createdAt])
      return message
    },
    async listMessages(conversationId) {
      const result = await client.query<MessageRow>(`
        SELECT id, conversation_id AS "conversationId", role, content, confidence, sources, source_scores AS "sourceScores",
          retrieval_method AS "retrievalMethod", generation_provider AS "generationProvider", latency_ms AS "latencyMs",
          should_escalate AS "shouldEscalate", created_at AS "createdAt"
        FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC
      `, [conversationId])
      return result.rows.map((row) => ({ ...row, conversationId: Number(row.conversationId), createdAt: new Date(row.createdAt).toISOString() }))
    },
    async getLatestAssistantMessageId(conversationId) {
      const result = await client.query<{ id: string }>("SELECT id FROM messages WHERE conversation_id = $1 AND role = 'assistant' ORDER BY created_at DESC LIMIT 1", [conversationId])
      return result.rows[0]?.id
    },
    async getCustomerContext(conversationId) {
      const current = await getConversation(conversationId)
      if (!current) return undefined
      const counts = await client.query<{ total: string; open: string }>(`
        SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status IN ('open', 'pending')) AS open
        FROM conversations WHERE customer_name = $1
      `, [current.customerName])
      const topics = await client.query<{ topic: string; count: string }>('SELECT topic, COUNT(*) AS count FROM conversations WHERE customer_name = $1 GROUP BY topic ORDER BY count DESC, topic ASC LIMIT 5', [current.customerName])
      const history = await client.query<ConversationRow & { lastMessage: string | null }>(`
        SELECT ${columns}, (SELECT content FROM messages WHERE conversation_id = conversations.id ORDER BY created_at DESC LIMIT 1) AS "lastMessage"
        FROM conversations WHERE customer_name = $1 AND id != $2 ORDER BY updated_at DESC LIMIT 5
      `, [current.customerName, conversationId])
      return { customer: current.customerName, totalConversations: Number(counts.rows[0].total), openConversations: Number(counts.rows[0].open),
        topics: topics.rows.map((row) => ({ topic: row.topic, count: Number(row.count) })),
        history: history.rows.map((row) => ({ ...mapConversation(row), lastMessage: row.lastMessage })) }
    },
  }
}
