import { mkdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { createSqliteKnowledgeRepository } from './repositories/sqlite-knowledge-repository.js'
import { createSqliteGraphRepository } from './repositories/sqlite-graph-repository.js'
import type { GraphNodeType } from './repositories/graph-repository.js'
export type { GraphNodeType } from './repositories/graph-repository.js'
export type { KnowledgeDocument } from './repositories/knowledge-repository.js'
export type { KnowledgeEmbeddingRecord, EmbeddedKnowledgeDocument } from './repositories/knowledge-repository.js'
export type { KnowledgeSourceFeedbackStats } from './repositories/knowledge-repository.js'
import { databaseEngine } from './database-runtime.js'
export { calculateQualityScore, inferTopic } from './support-domain.js'

void databaseEngine
const sqliteBootstrapEnabled = databaseEngine === 'sqlite'

const databasePath = resolve('data', 'aria.db')
mkdirSync(dirname(databasePath), { recursive: true })

export const db = new DatabaseSync(databasePath)

if (sqliteBootstrapEnabled) db.exec(`
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

if (sqliteBootstrapEnabled) {
  ensureColumn('messages', 'source_scores', 'TEXT')
  ensureColumn('messages', 'retrieval_method', 'TEXT')
  ensureColumn('messages', 'generation_provider', 'TEXT')
  ensureColumn('messages', 'latency_ms', 'INTEGER')
  runMigrations()
}

export const { upsertGraphNode, getGraphNode, listGraphNodes, createGraphRelationship, listGraphRelationships, deleteGraphRelationship, deleteGraphNode, queryGraphPaths, findGraphKnowledgeTitles } = createSqliteGraphRepository(db)

if (sqliteBootstrapEnabled) seedDatabase()

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
    {
      version: '007_audit_logs',
      file: resolve('server', 'migrations', '007_audit_logs.sql'),
    },
    {
      version: '008_webhook_delivery_logs',
      file: resolve('server', 'migrations', '008_webhook_delivery_logs.sql'),
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

export const {
  listKnowledge, listArchivedKnowledge, createKnowledgeDocument, updateKnowledgeDocument,
  archiveKnowledgeDocuments, restoreKnowledgeDocuments, deleteKnowledgeDocuments, getKnowledgeDocumentVersions,
  listKnowledgeEmbeddingCandidates, upsertKnowledgeEmbedding, getKnowledgeEmbeddingStats, listEmbeddedKnowledge,
  getKnowledgeSourceFeedbackStats, incrementKnowledgeUses,
} = createSqliteKnowledgeRepository(db)



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
