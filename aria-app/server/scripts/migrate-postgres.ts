import '../env.js'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Pool } from 'pg'
import { db } from '../database.js'

const databaseUrl = process.env.DATABASE_URL?.trim()
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to migrate SQLite data to PostgreSQL')
}

const pool = new Pool({
  connectionString: databaseUrl,
  max: Number(process.env.DB_POOL_MAX ?? 10),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
})

const client = await pool.connect()
try {
  await client.query('BEGIN')
  await client.query(readFileSync(resolve('server', 'migrations', 'postgres-schema.sql'), 'utf8'))

  await copyTable('users', ['id', 'email', 'display_name', 'role', 'password_hash', 'password_salt', 'created_at', 'updated_at'])
  await copyTable('conversations', ['id', 'customer_name', 'subject', 'status', 'priority', 'topic', 'assigned_to', 'tags', 'escalated', 'created_at', 'updated_at'], (row) => ({
    ...row,
    tags: row.tags ? JSON.parse(String(row.tags)) : [],
    escalated: Boolean(row.escalated),
  }))
  await copyTable('knowledge_documents', ['id', 'title', 'category', 'content', 'status', 'uses', 'archived_at', 'updated_at'])
  await copyTable('knowledge_embeddings', ['knowledge_document_id', 'model', 'dimensions', 'vector', 'content_hash', 'updated_at'], (row) => ({
    ...row,
    vector: JSON.parse(String(row.vector)),
  }))
  await copyTable('messages', ['id', 'conversation_id', 'role', 'content', 'confidence', 'sources', 'source_scores', 'retrieval_method', 'generation_provider', 'should_escalate', 'created_at'], (row) => ({
    ...row,
    sources: row.sources ? JSON.parse(String(row.sources)) : null,
    source_scores: row.source_scores ? JSON.parse(String(row.source_scores)) : null,
    should_escalate: Boolean(row.should_escalate),
  }))
  await copyTable('feedback', ['id', 'message_id', 'conversation_id', 'rating', 'feedback_type', 'comment', 'edited_response', 'quality_score', 'created_at'])
  await copyTable('sessions', ['id', 'user_id', 'token_hash', 'expires_at', 'created_at', 'revoked_at'])
  await copyTable('knowledge_document_versions', ['id', 'knowledge_document_id', 'version', 'title', 'category', 'content', 'source_filename', 'created_at', 'archived_at'])
  await copyTable('notifications', ['id', 'kind', 'title', 'message', 'read_at', 'created_at'])
  await copyTable('webhook_subscriptions', ['id', 'name', 'url', 'secret', 'events', 'active', 'created_at', 'updated_at'], (row) => ({
    ...row,
    events: row.events ? JSON.parse(String(row.events)) : ['*'],
    active: Boolean(row.active),
  }))
  await copyTable('graph_nodes', ['id', 'type', 'properties', 'created_at', 'updated_at'], (row) => ({
    ...row,
    properties: row.properties ? JSON.parse(String(row.properties)) : {},
  }))
  await copyTable('graph_relationships', ['id', 'source_id', 'type', 'target_id', 'properties', 'created_at'], (row) => ({
    ...row,
    properties: row.properties ? JSON.parse(String(row.properties)) : {},
  }))
  await copyTable('audit_logs', ['id', 'actor_user_id', 'actor_email', 'action', 'entity_type', 'entity_id', 'metadata', 'created_at'], (row) => ({
    ...row,
    metadata: row.metadata ? JSON.parse(String(row.metadata)) : {},
  }))

  for (const table of ['users', 'conversations', 'knowledge_documents', 'sessions', 'knowledge_document_versions', 'notifications', 'webhook_subscriptions', 'graph_relationships', 'audit_logs']) {
    await client.query(`SELECT setval(pg_get_serial_sequence($1, 'id'), COALESCE((SELECT MAX(id) FROM ${table}), 1), true)`, [table])
  }
  await client.query(`
    INSERT INTO schema_migrations (version, applied_at)
    VALUES ('sqlite_import', NOW())
    ON CONFLICT (version) DO UPDATE SET applied_at = EXCLUDED.applied_at
  `)
  await client.query('COMMIT')
  console.log('SQLite data migrated to PostgreSQL successfully.')
} catch (error) {
  await client.query('ROLLBACK')
  throw error
} finally {
  client.release()
  await pool.end()
  db.close()
}

async function copyTable(
  table: string,
  columns: string[],
  transform: (row: Record<string, unknown>) => Record<string, unknown> = (row) => row,
) {
  const rows = db.prepare(`SELECT ${columns.join(', ')} FROM ${table}`).all() as Record<string, unknown>[]
  if (rows.length === 0) return

  const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ')
  const query = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`
  for (const originalRow of rows) {
    const row = transform(originalRow)
    await client.query(query, columns.map((column) => row[column]))
  }
  console.log(`Migrated ${rows.length} rows from ${table}.`)
}
