import { mkdirSync } from 'node:fs'
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
`)

seedDatabase()

function seedDatabase() {
  const now = new Date().toISOString()
  seedKnowledge(now)

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

export function calculateQualityScore(rating?: number, feedbackType = 'customer_rating') {
  const ratingScore = rating ? rating * 20 : 60
  const actionAdjustment = feedbackType === 'accepted' ? 15 : feedbackType === 'rejected' ? -20 : 0
  return Math.max(0, Math.min(100, ratingScore + actionAdjustment))
}

export function listKnowledge() {
  return db.prepare(`
    SELECT id, title, category, content, status, uses, updated_at AS updatedAt
    FROM knowledge_documents ORDER BY uses DESC, updated_at DESC
  `).all() as KnowledgeDocument[]
}

export function createKnowledgeDocument(input: { title: string; category: string; content: string; status?: string }) {
  const now = new Date().toISOString()
  const created = db.prepare(`
    INSERT INTO knowledge_documents (title, category, content, status, uses, updated_at)
    VALUES (?, ?, ?, ?, 0, ?)
  `).run(input.title, input.category, input.content, input.status ?? 'indexed', now)

  return db.prepare(`
    SELECT id, title, category, content, status, uses, updated_at AS updatedAt
    FROM knowledge_documents WHERE id = ?
  `).get(Number(created.lastInsertRowid)) as KnowledgeDocument
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

  return rows
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
    .slice(0, limit)
}
