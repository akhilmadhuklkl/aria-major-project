import { Pool, type PoolConfig } from 'pg'
import { db } from './database.js'
import type { AsyncAnalyticsRepository } from './repositories/analytics-repository.js'
import type { AsyncAuditRepository } from './repositories/audit-repository.js'
import type { AsyncAuthRepository } from './repositories/auth-repository.js'
import { sqliteAuthRepository } from './repositories/auth-repository.js'
import type { AsyncConversationRepository } from './repositories/conversation-repository.js'
import { sqliteConversationRepository } from './repositories/sqlite-conversation-repository.js'
import type { AsyncFeedbackRepository } from './repositories/feedback-repository.js'
import { sqliteFeedbackRepository } from './repositories/sqlite-feedback-repository.js'
import type { AsyncGraphRepository } from './repositories/graph-repository.js'
import type { AsyncKnowledgeRepository } from './repositories/knowledge-repository.js'
import { createSqliteKnowledgeRepository } from './repositories/sqlite-knowledge-repository.js'
import type { AsyncNotificationRepository } from './repositories/notification-repository.js'
import { sqliteNotificationRepository } from './repositories/sqlite-notification-repository.js'
import { sqliteAuditRepository } from './repositories/sqlite-audit-repository.js'
import type { AsyncSystemRepository } from './repositories/system-repository.js'
import type { AsyncWebhookRepository } from './repositories/webhook-repository.js'
import { sqliteWebhookRepository } from './repositories/sqlite-webhook-repository.js'
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
  | { engine: 'sqlite'; auth: AsyncAuthRepository; conversations: AsyncConversationRepository; feedback: AsyncFeedbackRepository; notifications: AsyncNotificationRepository; audit: AsyncAuditRepository; knowledge: AsyncKnowledgeRepository; webhooks: AsyncWebhookRepository; system: AsyncSystemRepository; postgres: null; close(): Promise<void> }
  | { engine: 'postgres'; auth: AsyncAuthRepository; conversations: AsyncConversationRepository; feedback: AsyncFeedbackRepository; notifications: AsyncNotificationRepository; audit: AsyncAuditRepository; knowledge: AsyncKnowledgeRepository; webhooks: AsyncWebhookRepository; system: AsyncSystemRepository; pool: RuntimePool; postgres: PostgresRepositorySet; close(): Promise<void> }

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

function createAsyncSqliteAuthRepository(): AsyncAuthRepository {
  return {
    async ensureSchema() {
      sqliteAuthRepository.ensureSchema()
    },
    async countUsers() {
      return sqliteAuthRepository.countUsers()
    },
    async findUserByEmail(email) {
      return sqliteAuthRepository.findUserByEmail(email)
    },
    async findUserById(id) {
      return sqliteAuthRepository.findUserById(id)
    },
    async insertUser(input) {
      return sqliteAuthRepository.insertUser(input)
    },
    async insertSession(input) {
      sqliteAuthRepository.insertSession(input)
    },
    async revokeSession(tokenHash, revokedAt) {
      sqliteAuthRepository.revokeSession(tokenHash, revokedAt)
    },
    async findUserByToken(tokenHash) {
      return sqliteAuthRepository.findUserByToken(tokenHash)
    },
    async findCredentialsByUserId(id) {
      return sqliteAuthRepository.findCredentialsByUserId(id)
    },
    async updateCredentials(id, credentials, updatedAt) {
      sqliteAuthRepository.updateCredentials(id, credentials, updatedAt)
    },
    async revokeUserSessions(id, revokedAt) {
      sqliteAuthRepository.revokeUserSessions(id, revokedAt)
    },
    async listSupportAgents() {
      return sqliteAuthRepository.listSupportAgents()
    },
    async listUsers() {
      return sqliteAuthRepository.listUsers()
    },
  }
}

function createAsyncSqliteConversationRepository(): AsyncConversationRepository {
  return {
    async listConversations() {
      return sqliteConversationRepository.listConversations()
    },
    async listConversationPage(limit, offset, search) {
      return sqliteConversationRepository.listConversationPage(limit, offset, search)
    },
    async createConversation(input) {
      return sqliteConversationRepository.createConversation(input)
    },
    async getConversation(id) {
      return sqliteConversationRepository.getConversation(id)
    },
    async updateConversation(id, changes) {
      return sqliteConversationRepository.updateConversation(id, changes)
    },
    async appendMessage(message) {
      return sqliteConversationRepository.appendMessage(message)
    },
    async getLatestAssistantMessageId(conversationId) {
      return sqliteConversationRepository.getLatestAssistantMessageId(conversationId)
    },
    async listMessages(conversationId) {
      return sqliteConversationRepository.listMessages(conversationId)
    },
    async getCustomerContext(conversationId) {
      return sqliteConversationRepository.getCustomerContext(conversationId)
    },
  }
}

function createAsyncSqliteFeedbackRepository(): AsyncFeedbackRepository {
  return {
    async insertFeedback(entry) {
      sqliteFeedbackRepository.insertFeedback(entry)
    },
  }
}

function createAsyncSqliteNotificationRepository(): AsyncNotificationRepository {
  return {
    async createNotification(input) {
      return sqliteNotificationRepository.createNotification(input)
    },
    async listNotifications(limit) {
      return sqliteNotificationRepository.listNotifications(limit)
    },
    async markNotificationRead(id) {
      return sqliteNotificationRepository.markNotificationRead(id)
    },
    async markAllNotificationsRead() {
      return Number(sqliteNotificationRepository.markAllNotificationsRead())
    },
  }
}

function createAsyncSqliteAuditRepository(): AsyncAuditRepository {
  return {
    async createAuditLog(input) {
      return sqliteAuditRepository.createAuditLog(input)
    },
    async listAuditLogs(limit) {
      return sqliteAuditRepository.listAuditLogs(limit)
    },
  }
}

function createAsyncSqliteKnowledgeRepository(): AsyncKnowledgeRepository {
  const repository = createSqliteKnowledgeRepository(db)
  return {
    async getKnowledgeSourceFeedbackStats() {
      return repository.getKnowledgeSourceFeedbackStats()
    },
    async incrementKnowledgeUses(title) {
      repository.incrementKnowledgeUses(title)
    },
    async listKnowledgeEmbeddingCandidates() {
      return repository.listKnowledgeEmbeddingCandidates()
    },
    async upsertKnowledgeEmbedding(input) {
      repository.upsertKnowledgeEmbedding(input)
    },
    async getKnowledgeEmbeddingStats() {
      return repository.getKnowledgeEmbeddingStats()
    },
    async listEmbeddedKnowledge() {
      return repository.listEmbeddedKnowledge()
    },
    async listKnowledge() {
      return repository.listKnowledge()
    },
    async listArchivedKnowledge() {
      return repository.listArchivedKnowledge()
    },
    async createKnowledgeDocument(input) {
      return repository.createKnowledgeDocument(input)
    },
    async updateKnowledgeDocument(id, input) {
      return repository.updateKnowledgeDocument(id, input)
    },
    async archiveKnowledgeDocuments(ids) {
      return repository.archiveKnowledgeDocuments(ids)
    },
    async restoreKnowledgeDocuments(ids) {
      return repository.restoreKnowledgeDocuments(ids)
    },
    async deleteKnowledgeDocuments(ids) {
      return repository.deleteKnowledgeDocuments(ids)
    },
    async getKnowledgeDocumentVersions(id) {
      return repository.getKnowledgeDocumentVersions(id)
    },
  }
}

function createAsyncSqliteWebhookRepository(): AsyncWebhookRepository {
  return {
    async insertSubscription(input) {
      return sqliteWebhookRepository.insertSubscription(input)
    },
    async listSubscriptionsWithSecrets() {
      return sqliteWebhookRepository.listSubscriptionsWithSecrets()
    },
    async deleteSubscription(id) {
      return sqliteWebhookRepository.deleteSubscription(id)
    },
    async updateSubscription(id, active, updatedAt) {
      return sqliteWebhookRepository.updateSubscription(id, active, updatedAt)
    },
    async insertDelivery(input) {
      sqliteWebhookRepository.insertDelivery(input)
    },
    async listDeliveries(limit) {
      return sqliteWebhookRepository.listDeliveries(limit)
    },
  }
}

export function createRuntimeRepositories(engine: DatabaseEngine, options: RuntimeRepositoryOptions = {}): RuntimeRepositories {
  if (engine === 'sqlite') return { engine, auth: createAsyncSqliteAuthRepository(), conversations: createAsyncSqliteConversationRepository(), feedback: createAsyncSqliteFeedbackRepository(), notifications: createAsyncSqliteNotificationRepository(), audit: createAsyncSqliteAuditRepository(), knowledge: createAsyncSqliteKnowledgeRepository(), webhooks: createAsyncSqliteWebhookRepository(), system: createAsyncSqliteSystemRepository(), postgres: null, close: async () => {} }

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
  return { engine, auth: postgres.auth, conversations: postgres.conversations, feedback: postgres.feedback, notifications: postgres.notifications, audit: postgres.audit, knowledge: postgres.knowledge, webhooks: postgres.webhooks, system: postgres.system, pool, postgres, close: () => pool.end() }
}
