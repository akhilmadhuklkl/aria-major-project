import '../env.js'
import { DatabaseSync } from 'node:sqlite'
import { Pool } from 'pg'

const databaseUrl = process.env.DATABASE_URL?.trim()
if (!databaseUrl) throw new Error('DATABASE_URL is required for PostgreSQL preflight')

let parsedUrl: URL
try {
  parsedUrl = new URL(databaseUrl)
} catch {
  throw new Error('DATABASE_URL must be a valid PostgreSQL connection URL')
}

if (parsedUrl.protocol !== 'postgres:' && parsedUrl.protocol !== 'postgresql:') {
  throw new Error('DATABASE_URL must use the postgres:// or postgresql:// scheme')
}

const pool = new Pool({
  connectionString: databaseUrl,
  max: 1,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 10_000,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
})
const sqlite = new DatabaseSync('data/aria.db', { readOnly: true })

const sourceTables = [
  'users',
  'conversations',
  'messages',
  'feedback',
  'knowledge_documents',
  'knowledge_embeddings',
  'knowledge_document_versions',
  'notifications',
  'webhook_subscriptions',
  'webhook_delivery_logs',
  'graph_nodes',
  'graph_relationships',
  'audit_logs',
]

try {
  const integrity = sqlite.prepare('PRAGMA integrity_check').get() as { integrity_check?: string }
  if (integrity.integrity_check !== 'ok') throw new Error(`SQLite integrity check failed: ${integrity.integrity_check ?? 'unknown result'}`)

  const counts = Object.fromEntries(sourceTables.map((table) => {
    const row = sqlite.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as { count: number }
    return [table, Number(row.count)]
  }))

  const client = await pool.connect()
  try {
    await client.query('SELECT 1')
  } finally {
    client.release()
  }

  console.log('ARIA PostgreSQL Migration Preflight')
  console.log('----------------------------------------')
  console.log(`Target reachable: ${parsedUrl.hostname}:${parsedUrl.port || '5432'}`)
  console.log('SQLite integrity: PASS')
  console.log(`Source rows: ${Object.entries(counts).map(([table, count]) => `${table}=${count}`).join(', ')}`)
  console.log('Preflight passed. Run npm run migrate:postgres to begin the transactional import.')
} finally {
  sqlite.close()
  await pool.end()
}
