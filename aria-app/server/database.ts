import { mkdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

const databasePath = resolve('data', 'aria.db')
mkdirSync(dirname(databasePath), { recursive: true })

export const db = new DatabaseSync(databasePath)

export type KnowledgeDocument = {
  id: number
  title: string
  category: string
  content: string
  status: string
  uses: number
  updatedAt: string
  archivedAt?: string | null
}

db.exec(`
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT NOT NULL,
    subject TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    priority TEXT NOT NULL DEFAULT 'normal',
    topic TEXT NOT NULL DEFAULT 'General',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id INTEGER NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    confidence REAL,
    sources TEXT,
    should_escalate INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id)
  );

  CREATE TABLE IF NOT EXISTS feedback (
    id TEXT PRIMARY KEY,
    message_id TEXT NOT NULL,
    conversation_id INTEGER NOT NULL,
    rating INTEGER,
    feedback_type TEXT NOT NULL DEFAULT 'customer_rating',
    comment TEXT,
    edited_response TEXT,
    quality_score REAL NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (message_id) REFERENCES messages(id),
    FOREIGN KEY (conversation_id) REFERENCES conversations(id)
  );

  CREATE TABLE IF NOT EXISTS knowledge_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL,
    content TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'indexed',
    uses INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS knowledge_embeddings (
    knowledge_document_id INTEGER PRIMARY KEY,
    model TEXT NOT NULL,
    dimensions INTEGER NOT NULL,
    vector TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (knowledge_document_id) REFERENCES knowledge_documents(id) ON DELETE CASCADE
  );
`)

ensureColumn('messages', 'source_scores', 'TEXT')
ensureColumn('messages', 'retrieval_method', 'TEXT')
ensureColumn('messages', 'generation_provider', 'TEXT')
runMigrations()

seedDatabase()

function runMigrations() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `)

  db.prepare(`
    INSERT OR IGNORE INTO schema_migrations (version, applied_at)
    VALUES ('000_initial_schema', ?)
  `).run(new Date().toISOString())

  const migrations = [
    {
      version: '001_performance_indexes',
      file: resolve('server', 'migrations', '001_performance_indexes.sql'),
    },
    {
      version: '002_knowledge_document_lifecycle',
      file: resolve('server', 'migrations', '002_knowledge_document_lifecycle.sql'),
    },
    {
      version: '003_conversation_management',
      file: resolve('server', 'migrations', '003_conversation_management.sql'),
    },
    {
      version: '004_notifications',
      file: resolve('server', 'migrations', '004_notifications.sql'),
    },
    {
      version: '005_webhooks',
      file: resolve('server', 'migrations', '005_webhooks.sql'),
    },
    {
      version: '006_knowledge_graph',
      file: resolve('server', 'migrations', '006_knowledge_graph.sql'),
    },
  ]

  for (const migration of migrations) {
    const applied = db.prepare('SELECT 1 FROM schema_migrations WHERE version = ?').get(migration.version)
    if (applied) continue
    db.exec(readFileSync(migration.file, 'utf8'))
    db.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)')
      .run(migration.version, new Date().toISOString())
  }
}

function ensureColumn(table: string, column: string, definition: string) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>
  if (!columns.some((item) => item.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
  }
}

function seedDatabase() {
  const now = new Date().toISOString()
  seedKnowledge(now)
  seedKnowledgeGraph(now)

  const conversationCount = db.prepare('SELECT COUNT(*) AS count FROM conversations').get() as { count: number }
  if (conversationCount.count === 0) {
    const insert = db.prepare(`
      INSERT INTO conversations (customer_name, subject, status, priority, topic, created_at, updated_at)
      VALUES (?, ?, 'open', ?, ?, ?, ?)
    `)
    const records = [
      ['Maya Chen', 'Refund status', 'high', 'Refunds'],
      ['Noah Williams', 'Reset password', 'normal', 'Accounts'],
      ['Priya Sharma', 'Change delivery address', 'normal', 'Delivery'],
      ['Daniel Lee', 'Damaged item', 'high', 'Products'],
      ['Olivia Martin', 'Subscription cancellation', 'normal', 'Billing'],
    ]
    for (const record of records) insert.run(...record, now, now)
  }
}

export type GraphNodeType = 'Customer' | 'Order' | 'Product' | 'Payment' | 'Refund' | 'Delivery' | 'Subscription' | 'SupportIssue' | 'SupportProcedure' | 'KnowledgeDocument' | 'SupportAgent'

export function upsertGraphNode(input: { id: string; type: GraphNodeType; properties?: Record<string, string | number | boolean | null> }) {
  const now = new Date().toISOString()
  db.prepare(`
    INSERT INTO graph_nodes (id, type, properties, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET type = excluded.type, properties = excluded.properties, updated_at = excluded.updated_at
  `).run(input.id, input.type, JSON.stringify(input.properties ?? {}), now, now)
  return getGraphNode(input.id)
}

export function createGraphRelationship(input: { sourceId: string; type: string; targetId: string; properties?: Record<string, string | number | boolean | null> }) {
  const createdAt = new Date().toISOString()
  db.prepare(`
    INSERT INTO graph_relationships (source_id, type, target_id, properties, created_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(source_id, type, target_id) DO UPDATE SET properties = excluded.properties
  `).run(input.sourceId, input.type, input.targetId, JSON.stringify(input.properties ?? {}), createdAt)
  return { ...input, properties: input.properties ?? {} }
}

export function getGraphNode(id: string) {
  const row = db.prepare('SELECT id, type, properties, created_at AS createdAt, updated_at AS updatedAt FROM graph_nodes WHERE id = ?').get(id) as Record<string, unknown> | undefined
  if (!row) return null
  return { ...row, properties: JSON.parse(String(row.properties ?? '{}')) }
}

export function listGraphNodes(limit = 100) {
  return db.prepare('SELECT id, type, properties, created_at AS createdAt, updated_at AS updatedAt FROM graph_nodes ORDER BY id LIMIT ?').all(Math.min(Math.max(limit, 1), 500)).map((row) => {
    const item = row as Record<string, unknown>
    return { ...item, properties: JSON.parse(String(item.properties ?? '{}')) }
  })
}

export function listGraphRelationships(limit = 500) {
  return db.prepare('SELECT source_id AS sourceId, type, target_id AS targetId, properties, created_at AS createdAt FROM graph_relationships ORDER BY source_id, target_id LIMIT ?').all(Math.min(Math.max(limit, 1), 1000)).map((row) => {
    const item = row as Record<string, unknown>
    return { ...item, properties: JSON.parse(String(item.properties ?? '{}')) }
  })
}

export function deleteGraphRelationship(input: { sourceId: string; type: string; targetId: string }) {
  return db.prepare('DELETE FROM graph_relationships WHERE source_id = ? AND type = ? AND target_id = ?')
    .run(input.sourceId, input.type, input.targetId).changes > 0
}

export function deleteGraphNode(id: string) {
  return db.prepare('DELETE FROM graph_nodes WHERE id = ?').run(id).changes > 0
}

export function queryGraphPaths(startId: string, maxHops = 2) {
  const depthLimit = Math.min(Math.max(maxHops, 1), 2)
  const edges = db.prepare('SELECT source_id AS sourceId, type, target_id AS targetId, properties FROM graph_relationships').all().map((row) => {
    const item = row as Record<string, unknown>
    return { sourceId: String(item.sourceId), type: String(item.type), targetId: String(item.targetId), properties: JSON.parse(String(item.properties ?? '{}')) }
  })
  const paths: Array<{ nodes: string[]; relationships: string[] }> = []
  const visit = (nodeId: string, nodes: string[], relationships: string[]) => {
    if (relationships.length >= depthLimit) return
    for (const edge of edges.filter((item) => item.sourceId === nodeId)) {
      if (nodes.includes(edge.targetId)) continue
      const nextNodes = [...nodes, edge.targetId]
      const nextRelationships = [...relationships, edge.type]
      paths.push({ nodes: nextNodes, relationships: nextRelationships })
      visit(edge.targetId, nextNodes, nextRelationships)
    }
  }
  if (getGraphNode(startId)) visit(startId, [startId], [])
  return paths
}

export function findGraphKnowledgeTitles(query: string) {
  const terms = query.toLowerCase().split(/[^a-z0-9]+/).filter((term) => term.length > 2)
  const nodes = db.prepare('SELECT id, type, properties FROM graph_nodes').all().map((row) => {
    const item = row as Record<string, unknown>
    const properties = JSON.parse(String(item.properties ?? '{}')) as Record<string, unknown>
    return { id: String(item.id), type: String(item.type), title: typeof properties.title === 'string' ? properties.title : '', text: `${item.id} ${item.type} ${String(item.properties ?? '{}')}`.toLowerCase() }
  })
  const edges = db.prepare('SELECT source_id AS sourceId, target_id AS targetId FROM graph_relationships').all() as Array<{ sourceId: string; targetId: string }>
  const matched = nodes.filter((node) => terms.some((term) => node.text.includes(term))).map((node) => node.id)
  const connected = new Set(matched)
  for (const nodeId of matched) {
    for (const edge of edges) {
      if (edge.sourceId === nodeId) connected.add(edge.targetId)
      if (edge.targetId === nodeId) connected.add(edge.sourceId)
    }
  }
  return nodes.filter((node) => node.type === 'KnowledgeDocument' && connected.has(node.id))
    .map((node) => node.title)
    .filter(Boolean)
}

function seedKnowledgeGraph(now: string) {
  const refundDoc = db.prepare("SELECT id FROM knowledge_documents WHERE title = 'Refund and return policy'").get() as { id: number } | undefined
  const nodes = [
    ['customer:customer-001', 'Customer', { name: 'Demo customer' }],
    ['order:order-20491', 'Order', { status: 'refund_pending' }],
    ['refund:refund-20491', 'Refund', { status: 'approved' }],
    ['issue:refund-delay', 'SupportIssue', { title: 'Refund delay' }],
    ['payment:payment-20491', 'Payment', { provider: 'Payment provider' }],
    ['procedure:refund-timeline-check', 'SupportProcedure', { title: 'Refund timeline check' }],
    ['agent:support-001', 'SupportAgent', { name: 'Support agent' }],
    ...(refundDoc ? [[`knowledge:${refundDoc.id}`, 'KnowledgeDocument', { title: 'Refund and return policy', status: 'indexed' }]] : []),
  ] as Array<[string, GraphNodeType, Record<string, string | number | boolean | null>]>
  for (const [id, type, properties] of nodes) upsertGraphNode({ id, type, properties })
  createGraphRelationship({ sourceId: 'customer:customer-001', type: 'OWNS', targetId: 'order:order-20491' })
  createGraphRelationship({ sourceId: 'customer:customer-001', type: 'REPORTS', targetId: 'issue:refund-delay' })
  createGraphRelationship({ sourceId: 'order:order-20491', type: 'HAS_REFUND', targetId: 'refund:refund-20491' })
  createGraphRelationship({ sourceId: 'order:order-20491', type: 'USES', targetId: 'payment:payment-20491' })
  createGraphRelationship({ sourceId: 'refund:refund-20491', type: 'ABOUT', targetId: 'issue:refund-delay' })
  createGraphRelationship({ sourceId: 'refund:refund-20491', type: 'RESOLVED_BY', targetId: 'procedure:refund-timeline-check' })
  createGraphRelationship({ sourceId: 'issue:refund-delay', type: 'ASSIGNED_TO', targetId: 'agent:support-001' })
  createGraphRelationship({ sourceId: 'agent:support-001', type: 'FOLLOWS', targetId: 'procedure:refund-timeline-check' })
  if (refundDoc) createGraphRelationship({ sourceId: 'procedure:refund-timeline-check', type: 'SUPPORTED_BY', targetId: `knowledge:${refundDoc.id}` })
  void now
}

function seedKnowledge(now: string) {
  const upsert = db.prepare(`
    INSERT INTO knowledge_documents (title, category, content, status, uses, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(title) DO UPDATE SET
      category = excluded.category,
      content = excluded.content,
      status = excluded.status,
      uses = MAX(knowledge_documents.uses, excluded.uses),
      updated_at = excluded.updated_at
  `)
  const records = [
    [
      'Refund and return policy',
      'Policy',
      'Approved refunds normally appear within 5-7 business days after approval. If the refund is not visible after 7 business days, collect the order ID and escalate to the payments team for transaction tracing.',
      'indexed',
      128,
    ],
    [
      'Password reset procedure',
      'Procedure',
      'Users reset passwords from Account Settings > Security > Reset Password. If the customer cannot access email, verify account ownership and escalate to account recovery.',
      'indexed',
      94,
    ],
    [
      'Order delivery FAQ',
      'FAQ',
      'Delivery details can be changed before an order enters dispatch. Ask for the order number and updated address, then confirm whether the order is still editable.',
      'indexed',
      76,
    ],
    [
      'Damaged product resolution',
      'Procedure',
      'Damaged products can be replaced after photo verification. Ask the customer for the order number, photos of the damage, packaging condition, and delivery date.',
      'indexed',
      51,
    ],
    [
      'Subscription terms',
      'Policy',
      'Subscriptions can be cancelled before the renewal date. If renewal has already occurred, check refund eligibility under the refund policy before promising a reversal.',
      'indexed',
      48,
    ],
    [
      'Warranty claim process',
      'Procedure',
      'Warranty claims require the order number, product serial number, purchase date, and issue description. Escalate to warranty review if the product is outside the standard return window.',
      'indexed',
      42,
    ],
    [
      'Payment failure troubleshooting',
      'FAQ',
      'For failed payments, ask the customer to verify card details, billing address, bank approval, and available balance. If the account was charged without order creation, escalate to payments.',
      'indexed',
      39,
    ],
    [
      'Human escalation policy',
      'Policy',
      'Escalate to a human support agent when confidence is low, requested policy is missing, customer identity cannot be verified, or the customer reports repeated unresolved issues.',
      'indexed',
      36,
    ],
    [
      'Data privacy response',
      'Policy',
      'Do not expose passwords, saved card details, full payment details, access tokens, or private account information in chat. For privacy requests, verify identity and route the case to the privacy support queue.',
      'indexed',
      31,
    ],
    [
      'Loyalty points adjustment',
      'Procedure',
      'Missing loyalty points can be adjusted after confirming the order ID, customer account email, purchase date, and points expected. Escalate if the transaction is older than 30 days.',
      'indexed',
      24,
    ],
  ]

  for (const record of records) upsert.run(...record, now)
}

export function inferTopic(message: string) {
  const query = message.toLowerCase()
  if (query.includes('refund')) return 'Refunds'
  if (query.includes('password') || query.includes('login')) return 'Accounts'
  if (query.includes('delivery') || query.includes('address') || query.includes('shipping')) return 'Delivery'
  if (query.includes('damaged') || query.includes('product')) return 'Products'
  if (query.includes('subscription') || query.includes('billing')) return 'Billing'
  return 'General'
}

export function createNotification(input: { kind: string; title: string; message: string }) {
  const createdAt = new Date().toISOString()
  const result = db.prepare('INSERT INTO notifications (kind, title, message, created_at) VALUES (?, ?, ?, ?)')
    .run(input.kind, input.title, input.message, createdAt)
  return { id: Number(result.lastInsertRowid), ...input, readAt: null, createdAt }
}

export function listNotifications(limit = 20) {
  return db.prepare(`
    SELECT id, kind, title, message, read_at AS readAt, created_at AS createdAt
    FROM notifications ORDER BY created_at DESC LIMIT ?
  `).all(Math.max(1, Math.min(limit, 100)))
}

export function markNotificationRead(id: number) {
  return db.prepare('UPDATE notifications SET read_at = ? WHERE id = ?').run(new Date().toISOString(), id).changes > 0
}

export function markAllNotificationsRead() {
  return db.prepare('UPDATE notifications SET read_at = ? WHERE read_at IS NULL').run(new Date().toISOString()).changes
}

export function calculateQualityScore(rating?: number, feedbackType = 'customer_rating') {
  const ratingScore = rating ? rating * 20 : 60
  const actionAdjustment = feedbackType === 'accepted' ? 15 : feedbackType === 'rejected' ? -20 : 0
  return Math.max(0, Math.min(100, ratingScore + actionAdjustment))
}

export function listKnowledge() {
  return db.prepare(`
    SELECT id, title, category, content, status, uses, updated_at AS updatedAt, archived_at AS archivedAt
    FROM knowledge_documents
    WHERE archived_at IS NULL
    ORDER BY uses DESC, updated_at DESC
  `).all() as KnowledgeDocument[]
}

export function createKnowledgeDocument(input: { title: string; category: string; content: string; status?: string; sourceFilename?: string }) {
  const now = new Date().toISOString()
  const created = db.prepare(`
    INSERT INTO knowledge_documents (title, category, content, status, uses, updated_at, archived_at)
    VALUES (?, ?, ?, ?, 0, ?, NULL)
  `).run(input.title, input.category, input.content, input.status ?? 'indexed', now)

  const id = Number(created.lastInsertRowid)
  db.prepare(`
    INSERT INTO knowledge_document_versions
      (knowledge_document_id, version, title, category, content, source_filename, created_at)
    VALUES (?, 1, ?, ?, ?, ?, ?)
  `).run(id, input.title, input.category, input.content, input.sourceFilename ?? null, now)

  return db.prepare(`
    SELECT id, title, category, content, status, uses, updated_at AS updatedAt, archived_at AS archivedAt
    FROM knowledge_documents WHERE id = ?
  `).get(id) as KnowledgeDocument
}

export function archiveKnowledgeDocuments(ids: number[]) {
  const uniqueIds = [...new Set(ids.filter((id) => Number.isInteger(id) && id > 0))]
  if (uniqueIds.length === 0) return { archived: 0 }
  const placeholders = uniqueIds.map(() => '?').join(', ')
  const result = db.prepare(`
    UPDATE knowledge_documents SET archived_at = ?, updated_at = ?
    WHERE id IN (${placeholders}) AND archived_at IS NULL
  `).run(new Date().toISOString(), new Date().toISOString(), ...uniqueIds)
  return { archived: result.changes }
}

export function updateKnowledgeDocument(id: number, input: {
  title: string
  category: string
  content: string
  status?: string
  sourceFilename?: string
}) {
  const current = db.prepare('SELECT id FROM knowledge_documents WHERE id = ? AND archived_at IS NULL').get(id)
  if (!current) return null
  const now = new Date().toISOString()
  const nextVersion = db.prepare(`
    SELECT COALESCE(MAX(version), 0) + 1 AS version
    FROM knowledge_document_versions WHERE knowledge_document_id = ?
  `).get(id) as { version: number }

  db.prepare(`
    UPDATE knowledge_documents
    SET title = ?, category = ?, content = ?, status = ?, updated_at = ?
    WHERE id = ?
  `).run(input.title, input.category, input.content, input.status ?? 'indexed', now, id)
  db.prepare(`
    INSERT INTO knowledge_document_versions
      (knowledge_document_id, version, title, category, content, source_filename, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, nextVersion.version, input.title, input.category, input.content, input.sourceFilename ?? null, now)
  db.prepare('DELETE FROM knowledge_embeddings WHERE knowledge_document_id = ?').run(id)

  return db.prepare(`
    SELECT id, title, category, content, status, uses, updated_at AS updatedAt, archived_at AS archivedAt
    FROM knowledge_documents WHERE id = ?
  `).get(id) as KnowledgeDocument
}

export function getKnowledgeDocumentVersions(id: number) {
  return db.prepare(`
    SELECT id, knowledge_document_id AS knowledgeDocumentId, version, title, category,
      content, source_filename AS sourceFilename, created_at AS createdAt, archived_at AS archivedAt
    FROM knowledge_document_versions
    WHERE knowledge_document_id = ?
    ORDER BY version DESC
  `).all(id)
}

export function deleteKnowledgeDocuments(ids: number[]) {
  const uniqueIds = [...new Set(ids.filter((id) => Number.isInteger(id) && id > 0))]

  if (uniqueIds.length === 0) {
    return { deleted: 0 }
  }

  const placeholders = uniqueIds.map(() => '?').join(', ')
  const result = db.prepare(`
    DELETE FROM knowledge_documents
    WHERE id IN (${placeholders})
  `).run(...uniqueIds)

  return { deleted: result.changes }
}

export type KnowledgeEmbeddingRecord = {
  knowledgeDocumentId: number
  model: string
  dimensions: number
  vector: number[]
  contentHash: string
  updatedAt: string
}

export function listKnowledgeEmbeddingCandidates() {
  return db.prepare(`
    SELECT
      knowledge_documents.id,
      knowledge_documents.title,
      knowledge_documents.category,
      knowledge_documents.content,
      knowledge_documents.status,
      knowledge_embeddings.content_hash AS contentHash
    FROM knowledge_documents
    LEFT JOIN knowledge_embeddings
      ON knowledge_embeddings.knowledge_document_id = knowledge_documents.id
    WHERE knowledge_documents.status = 'indexed'
    ORDER BY knowledge_documents.id
  `).all() as Array<KnowledgeDocument & { contentHash?: string }>
}

export function upsertKnowledgeEmbedding(input: {
  knowledgeDocumentId: number
  model: string
  vector: number[]
  contentHash: string
}) {
  const now = new Date().toISOString()
  db.prepare(`
    INSERT INTO knowledge_embeddings (
      knowledge_document_id, model, dimensions, vector, content_hash, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(knowledge_document_id) DO UPDATE SET
      model = excluded.model,
      dimensions = excluded.dimensions,
      vector = excluded.vector,
      content_hash = excluded.content_hash,
      updated_at = excluded.updated_at
  `).run(
    input.knowledgeDocumentId,
    input.model,
    input.vector.length,
    JSON.stringify(input.vector),
    input.contentHash,
    now,
  )
}

export function getKnowledgeEmbeddingStats() {
  return db.prepare(`
    SELECT
      COUNT(*) AS count,
      COALESCE(MIN(dimensions), 0) AS minimumDimensions,
      COALESCE(MAX(dimensions), 0) AS maximumDimensions,
      COUNT(DISTINCT model) AS modelCount
    FROM knowledge_embeddings
  `).get() as {
    count: number
    minimumDimensions: number
    maximumDimensions: number
    modelCount: number
  }
}

export type EmbeddedKnowledgeDocument = KnowledgeDocument & {
  model: string
  dimensions: number
  vector: number[]
}

export function listEmbeddedKnowledge() {
  const rows = db.prepare(`
    SELECT
      knowledge_documents.id,
      knowledge_documents.title,
      knowledge_documents.category,
      knowledge_documents.content,
      knowledge_documents.status,
      knowledge_documents.uses,
      knowledge_documents.updated_at AS updatedAt,
      knowledge_embeddings.model,
      knowledge_embeddings.dimensions,
      knowledge_embeddings.vector
    FROM knowledge_embeddings
    JOIN knowledge_documents
      ON knowledge_documents.id = knowledge_embeddings.knowledge_document_id
    WHERE knowledge_documents.status = 'indexed'
    ORDER BY knowledge_documents.id
  `).all() as Array<Omit<EmbeddedKnowledgeDocument, 'vector'> & { vector: string }>

  return rows.map((row) => ({
    ...row,
    vector: JSON.parse(row.vector) as number[],
  }))
}

export type KnowledgeSourceFeedbackStats = {
  title: string
  feedbackCount: number
  averageQuality: number
  averageRating: number
  acceptedCount: number
  editedCount: number
  rejectedCount: number
}

export function getKnowledgeSourceFeedbackStats() {
  const knownTitles = new Set(listKnowledge().map((item) => item.title))
  const rows = db.prepare(`
    SELECT
      messages.sources,
      feedback.rating,
      feedback.feedback_type AS feedbackType,
      feedback.quality_score AS qualityScore
    FROM feedback
    JOIN messages ON messages.id = feedback.message_id
    WHERE messages.sources IS NOT NULL
      AND messages.sources != '[]'
  `).all() as Array<{
    sources: string
    rating: number | null
    feedbackType: string
    qualityScore: number
  }>

  const aggregates = new Map<string, {
    feedbackCount: number
    qualityTotal: number
    ratingCount: number
    ratingTotal: number
    acceptedCount: number
    editedCount: number
    rejectedCount: number
  }>()

  for (const row of rows) {
    const title = parseSourceTitles(row.sources).find((source) => knownTitles.has(source))
    if (!title) continue

    const aggregate = aggregates.get(title) ?? {
      feedbackCount: 0,
      qualityTotal: 0,
      ratingCount: 0,
      ratingTotal: 0,
      acceptedCount: 0,
      editedCount: 0,
      rejectedCount: 0,
    }
    aggregate.feedbackCount += 1
    aggregate.qualityTotal += row.qualityScore
    if (row.rating !== null) {
      aggregate.ratingCount += 1
      aggregate.ratingTotal += row.rating
    }
    if (row.feedbackType === 'accepted') aggregate.acceptedCount += 1
    if (row.feedbackType === 'edited') aggregate.editedCount += 1
    if (row.feedbackType === 'rejected') aggregate.rejectedCount += 1
    aggregates.set(title, aggregate)
  }

  return Array.from(aggregates, ([title, aggregate]) => ({
    title,
    feedbackCount: aggregate.feedbackCount,
    averageQuality: aggregate.feedbackCount
      ? aggregate.qualityTotal / aggregate.feedbackCount
      : 60,
    averageRating: aggregate.ratingCount
      ? aggregate.ratingTotal / aggregate.ratingCount
      : 0,
    acceptedCount: aggregate.acceptedCount,
    editedCount: aggregate.editedCount,
    rejectedCount: aggregate.rejectedCount,
  }))
}

function parseSourceTitles(value: string) {
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : []
  } catch {
    return []
  }
}

export function searchKnowledge(message: string, limit = 3) {
  const ignoredTerms = new Set([
    'the', 'and', 'for', 'you', 'your', 'how', 'long', 'does', 'take', 'after', 'before', 'with',
    'from', 'this', 'that', 'can', 'what', 'when', 'where', 'why',
  ])
  const terms = message
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length > 2 && !ignoredTerms.has(term))
  const rows = listKnowledge()

  const scoredRows = rows
    .map((row) => {
      const title = row.title.toLowerCase()
      const category = row.category.toLowerCase()
      const content = row.content.toLowerCase()
      const score = terms.reduce((total, term) => {
        if (title.includes(term)) return total + 4
        if (category.includes(term)) return total + 2
        if (content.includes(term)) return total + 1
        return total
      }, 0)
      return { ...row, score }
    })
    .filter((row) => row.score > 0)
    .sort((first, second) => second.score - first.score || second.uses - first.uses)

  const strongestScore = scoredRows[0]?.score ?? 0
  const strongMatchThreshold = Math.max(2, Math.ceil(strongestScore * 0.5))
  const strongMatches = scoredRows.filter((row) => row.score >= strongMatchThreshold)
  return (strongMatches.length > 0 ? strongMatches : scoredRows).slice(0, limit)
}
