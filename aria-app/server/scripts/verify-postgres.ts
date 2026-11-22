import '../env.js'
import { Pool } from 'pg'

const databaseUrl = process.env.DATABASE_URL?.trim()
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to verify PostgreSQL readiness')
}

const pool = new Pool({
  connectionString: databaseUrl,
  max: 2,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 10_000,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
})

const expectedTables: Record<string, string[]> = {
  schema_migrations: ['version', 'applied_at'],
  users: ['id', 'email', 'display_name', 'role'],
  sessions: ['id', 'user_id', 'token_hash', 'expires_at', 'revoked_at'],
  conversations: ['id', 'customer_name', 'subject', 'status', 'priority', 'assigned_to', 'tags', 'escalated'],
  messages: ['id', 'conversation_id', 'content', 'sources', 'source_scores', 'retrieval_method', 'generation_provider'],
  feedback: ['id', 'message_id', 'conversation_id', 'rating', 'quality_score'],
  knowledge_documents: ['id', 'title', 'category', 'content', 'status', 'archived_at'],
  knowledge_document_versions: ['id', 'knowledge_document_id', 'version', 'content'],
  knowledge_embeddings: ['knowledge_document_id', 'model', 'dimensions', 'vector', 'content_hash'],
  notifications: ['id', 'kind', 'title', 'message', 'read_at'],
  webhook_subscriptions: ['id', 'name', 'url', 'secret', 'events', 'active'],
  graph_nodes: ['id', 'type', 'properties'],
  graph_relationships: ['id', 'source_id', 'type', 'target_id', 'properties'],
}

const expectedIndexes = [
  'idx_pg_conversations_status_updated',
  'idx_pg_messages_conversation_created',
  'idx_pg_feedback_conversation_created',
  'idx_pg_knowledge_status_category',
  'idx_pg_sessions_expiry',
  'idx_pg_notifications_read_created',
  'idx_pg_graph_relationships_source',
  'idx_pg_graph_relationships_target',
]

const client = await pool.connect()
try {
  const tableRows = await client.query<{ table_name: string }>(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
  `)
  const tables = new Set(tableRows.rows.map((row) => row.table_name))
  const columnRows = await client.query<{ table_name: string; column_name: string }>(`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
  `)
  const columns = new Map<string, Set<string>>()
  for (const row of columnRows.rows) {
    const tableColumns = columns.get(row.table_name) ?? new Set<string>()
    tableColumns.add(row.column_name)
    columns.set(row.table_name, tableColumns)
  }

  const indexRows = await client.query<{ indexname: string }>(`
    SELECT indexname
    FROM pg_indexes
    WHERE schemaname = 'public'
  `)
  const indexes = new Set(indexRows.rows.map((row) => row.indexname))

  const failures: string[] = []
  for (const [table, requiredColumns] of Object.entries(expectedTables)) {
    if (!tables.has(table)) {
      failures.push(`missing table: ${table}`)
      continue
    }
    for (const column of requiredColumns) {
      if (!columns.get(table)?.has(column)) failures.push(`missing column: ${table}.${column}`)
    }
  }
  for (const index of expectedIndexes) {
    if (!indexes.has(index)) failures.push(`missing index: ${index}`)
  }

  console.log('\nARIA PostgreSQL Verification')
  console.log('----------------------------------------')
  console.log(`Tables discovered: ${tables.size}`)
  console.log(`Indexes discovered: ${indexes.size}`)
  if (failures.length === 0) {
    console.log('PASS PostgreSQL schema contains all required ARIA tables, columns, and indexes.')
    console.log('----------------------------------------')
    console.log('PostgreSQL verification passed.')
  } else {
    for (const failure of failures) console.log(`FAIL ${failure}`)
    console.log('----------------------------------------')
    console.log(`${failures.length} PostgreSQL schema checks failed.`)
    process.exitCode = 1
  }
} finally {
  client.release()
  await pool.end()
}
