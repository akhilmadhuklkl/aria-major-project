import { Pool, type PoolConfig } from 'pg'
import { db } from './database.js'
import type { AsyncAnalyticsRepository } from './repositories/analytics-repository.js'
import type { AsyncAuditRepository } from './repositories/audit-repository.js'
import type { AsyncAuthRepository } from './repositories/auth-repository.js'
import type { AsyncConversationRepository } from './repositories/conversation-repository.js'
import type { AsyncFeedbackRepository } from './repositories/feedback-repository.js'
import type { AsyncGraphRepository } from './repositories/graph-repository.js'
import type { AsyncKnowledgeRepository } from './repositories/knowledge-repository.js'
import type { AsyncNotificationRepository } from './repositories/notification-repository.js'
import type { AsyncSystemRepository } from './repositories/system-repository.js'
import type { AsyncWebhookRepository } from './repositories/webhook-repository.js'
import { createPostgresAnalyticsRepository } from './repositories/postgres-analytics-repository.js'
import { createPostgresAuditRepository } from './repositories/postgres-audit-repository.js'
import { createPostgresAuthRepository } from './repositories/postgres-auth-repository.js'
import { createPostgresConversationRepository } from './repositories/postgres-conversation-repository.js'
import { createPostgresFeedbackRepository } from './repositories/postgres-feedback-repository.js'
import { createPostgresGraphRepository } from './repositories/postgres-graph-repository.js'
import { createPostgresKnowledgeRepository } from './repositories/postgres-knowledge-repository.js'
import { createPostgresNotificationRepository } from './repositories/postgres-notification-repository.js'
import { createPostgresSystemRepository } from './repositories/postgres-system-repository.js'
import { createPostgresWebhookRepository } from './repositories/postgres-webhook-repository.js'
import { createSqliteSystemRepository } from './repositories/sqlite-system-repository.js'
import type { DatabaseEngine } from './database-runtime.js'

export type PostgresRepositorySet = {
  auth: AsyncAuthRepository
  conversations: AsyncConversationRepository
  feedback: AsyncFeedbackRepository
  notifications: AsyncNotificationRepository
  audit: AsyncAuditRepository
  analytics: AsyncAnalyticsRepository
  system: AsyncSystemRepository
  knowledge: AsyncKnowledgeRepository
  webhooks: AsyncWebhookRepository
  graph: AsyncGraphRepository
}

export type RuntimePool = Pick<Pool, 'query' | 'connect' | 'end'>

export type RuntimeRepositories =
  | { engine: 'sqlite'; system: AsyncSystemRepository; postgres: null; close(): Promise<void> }
  | { engine: 'postgres'; system: AsyncSystemRepository; pool: RuntimePool; postgres: PostgresRepositorySet; close(): Promise<void> }

type RuntimeRepositoryOptions = {
  databaseUrl?: string
  pool?: RuntimePool
  poolFactory?: (config: PoolConfig) => RuntimePool
}

export function createPostgresRepositorySet(pool: Pick<Pool, 'query' | 'connect'>): PostgresRepositorySet {
  return {
    auth: createPostgresAuthRepository(pool),
    conversations: createPostgresConversationRepository(pool),
    feedback: createPostgresFeedbackRepository(pool),
    notifications: createPostgresNotificationRepository(pool),
    audit: createPostgresAuditRepository(pool),
    analytics: createPostgresAnalyticsRepository(pool),
    system: createPostgresSystemRepository(pool),
    knowledge: createPostgresKnowledgeRepository(pool),
    webhooks: createPostgresWebhookRepository(pool),
    graph: createPostgresGraphRepository(pool),
  }
}

function createAsyncSqliteSystemRepository(): AsyncSystemRepository {
  const repository = createSqliteSystemRepository(db)
  return {
    async verifyConnection() {
      repository.verifyConnection()
    },
    async getRecordCounts() {
      return repository.getRecordCounts()
    },
  }
}

export function createRuntimeRepositories(engine: DatabaseEngine, options: RuntimeRepositoryOptions = {}): RuntimeRepositories {
  if (engine === 'sqlite') return { engine, system: createAsyncSqliteSystemRepository(), postgres: null, close: async () => {} }

  const databaseUrl = options.databaseUrl?.trim() || process.env.DATABASE_URL?.trim()
  if (!databaseUrl) throw new Error('DATABASE_URL is required when DATABASE_ENGINE=postgres')

  const pool = options.pool ?? (options.poolFactory ?? ((config) => new Pool(config)))({
    connectionString: databaseUrl,
    max: Number(process.env.DB_POOL_MAX ?? 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  })
  const postgres = createPostgresRepositorySet(pool)
  return { engine, system: postgres.system, pool, postgres, close: () => pool.end() }
}
