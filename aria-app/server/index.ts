import './env.js'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import multer from 'multer'
import { createAgentService, getAgentProvider } from './agent-service.js'
import { calculateFeedbackAdjustment, FeedbackAdaptationRanker, neutralQualityScore } from './feedback-adaptation.js'
import { HybridKnowledgeRetriever } from './hybrid-retrieval.js'
import { searchKnowledge } from './keyword-retrieval.js'
import { SemanticKnowledgeRetriever } from './semantic-retrieval.js'
import {
  createAuthService,
  getBearerToken,
  validateCredentials,
} from './auth.js'
import { extractDocumentText, getDocumentType } from './document-extraction.js'
import {
  createContentHash,
  createKnowledgeEmbeddingText,
  embeddingModel,
  LocalEmbeddingService,
} from './embedding-service.js'
import { createWebhookService, normalizeWebhookEvents, validateWebhookUrl, webhookEvents, type WebhookEvent } from './webhooks.js'
import { Neo4jGraphStore } from './neo4j-graph-store.js'
import { getRuntimeMetrics, recordRequest } from './metrics.js'
import { databaseEngine } from './database-runtime.js'
import { db } from './database.js'
import { checkDatabaseReadiness } from './readiness.js'
import { createRuntimeRepositories } from './runtime-repositories.js'
import { calculateQualityScore, inferTopic } from './support-domain.js'
import { errorMessage, logEvent } from './observability.js'
import type { NewAuditLog } from './repositories/audit-repository.js'
import type { AsyncKnowledgeRepository } from './repositories/knowledge-repository.js'
import type { AsyncNotificationRepository } from './repositories/notification-repository.js'
import type { ConversationPriority, ConversationStatus } from './repositories/conversation-repository.js'

const runtimeRepositories = createRuntimeRepositories(databaseEngine)
const systemRepository = runtimeRepositories.system
const conversationRepository = runtimeRepositories.conversations
const feedbackRepository = runtimeRepositories.feedback
const notificationRepository = runtimeRepositories.notifications
const auditRepository = runtimeRepositories.audit
const knowledgeRepository: AsyncKnowledgeRepository = runtimeRepositories.knowledge
const analyticsRepository = runtimeRepositories.analytics
const graphRepository = runtimeRepositories.graph
const webhookService = createWebhookService(runtimeRepositories.webhooks)
const authService = createAuthService(runtimeRepositories.auth)
await authService.ensureAuthSchema()

function notifyWebhook(event: WebhookEvent, data: Record<string, unknown>) {
  void webhookService.dispatchWebhookEvent(event, data)
}

function createNotification(input: Parameters<AsyncNotificationRepository['createNotification']>[0]) {
  return notificationRepository.createNotification(input)
}

async function recordAudit(request: express.Request, input: Omit<NewAuditLog, 'actorUserId' | 'actorEmail'>) {
  const actor = authService.getAuthenticatedUser(request)
  await auditRepository.createAuditLog({
    ...input,
    actorUserId: actor?.id,
    actorEmail: actor?.email,
  })
}

const app = express()
const allowedOrigins = (process.env.CORS_ORIGINS ?? '').split(',').map((origin) => origin.trim()).filter(Boolean)
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'too many authentication attempts; try again later' } })
const chatLimiter = rateLimit({ windowMs: 60 * 1000, limit: 60, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'too many chat requests; try again later' } })
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
})
const port = Number(process.env.PORT ?? 8787)
const mastraModel = process.env.MASTRA_MODEL ?? 'google/gemini-2.5-flash'
const hasRemoteMastraAgent = Boolean(process.env.MASTRA_AGENT_URL?.trim())
const mastraServerEnabled = process.env.ENABLE_MASTRA_SERVER === 'true' && !hasRemoteMastraAgent
const neo4jGraphStore = process.env.GRAPH_STORE === 'neo4j' ? new Neo4jGraphStore() : undefined
const hybridRetriever = new HybridKnowledgeRetriever(
  (query, limit) => searchKnowledge(knowledgeRepository, query, limit),
  new SemanticKnowledgeRetriever(undefined, () => knowledgeRepository.listEmbeddedKnowledge()),
  new FeedbackAdaptationRanker(() => knowledgeRepository.getKnowledgeSourceFeedbackStats()),
  neo4jGraphStore
    ? (query) => neo4jGraphStore.findKnowledgeTitles(query)
    : (query) => graphRepository.findGraphKnowledgeTitles(query),
)
const agent = createAgentService(hybridRetriever.retrieve)
const llmProvider = mastraModel.startsWith('google/')
  ? 'google-gemini'
  : mastraModel.startsWith('openai/')
    ? 'openai'
    : 'configured-model'

const authRequired = process.env.AUTH_REQUIRED === 'true'
const roleGuard = (...roles: ('admin' | 'support_agent' | 'customer')[]) => (
  authRequired ? authService.requireRole(...roles) : (_request: express.Request, _response: express.Response, next: express.NextFunction) => next()
)

function getLlmProviderConfigured() {
  if (llmProvider === 'google-gemini') {
    return Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim())
  }

  if (llmProvider === 'openai') {
    return Boolean(process.env.OPENAI_API_KEY?.trim())
  }

  return Boolean(
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim()
    || process.env.GOOGLE_API_KEY?.trim()
    || process.env.OPENAI_API_KEY?.trim(),
  )
}

async function getHealthSnapshot() {
  const embeddingStats = await knowledgeRepository.getKnowledgeEmbeddingStats()

  return {
    service: 'ARIA API',
    status: 'operational',
    agentProvider: getAgentProvider(),
    mastraRuntime: hasRemoteMastraAgent ? 'remote' : mastraServerEnabled ? 'embedded' : 'fallback',
    mastraEndpointConfigured: hasRemoteMastraAgent,
    database: databaseEngine,
    graphStore: neo4jGraphStore ? 'neo4j' : 'sqlite',
    mastraReady: true,
    mastraServerEnabled,
    mastraModel,
    llmProvider,
    llmProviderConfigured: getLlmProviderConfigured(),
    retrieval: {
      primary: 'hybrid',
      fallback: 'keyword',
      embeddingModel: 'Xenova/all-MiniLM-L6-v2',
      storedEmbeddings: embeddingStats.count,
      dimensions: embeddingStats.maximumDimensions,
      semanticThreshold: Number(process.env.RETRIEVAL_SEMANTIC_THRESHOLD ?? 0.2),
      hybridThreshold: Number(process.env.RETRIEVAL_HYBRID_THRESHOLD ?? 0.28),
      semanticWeight: Number(process.env.RETRIEVAL_SEMANTIC_WEIGHT ?? 0.7),
      keywordWeight: Number(process.env.RETRIEVAL_KEYWORD_WEIGHT ?? 0.3),
      confidenceThreshold: Number(process.env.AI_CONFIDENCE_THRESHOLD ?? 0.7),
    },
    authRequired,
    authSetupAvailable: await authService.getUserCount() === 0,
  }
}

app.use(helmet())
app.use(cors({ origin: allowedOrigins.length ? allowedOrigins : true }))
app.use(express.json({ limit: '1mb' }))
app.use((_request, response, next) => {
  const requestId = crypto.randomUUID()
  response.setHeader('X-Request-ID', requestId)
  const startedAt = performance.now()
  response.on('finish', () => {
    const latencyMs = Math.round(performance.now() - startedAt)
    recordRequest({ method: _request.method, route: _request.route?.path ?? _request.path, status: response.statusCode, latencyMs })
    logEvent(response.statusCode >= 500 ? 'error' : response.statusCode >= 400 ? 'warn' : 'info', 'http.request', {
      requestId,
      method: _request.method,
      route: _request.route?.path ?? _request.path,
      status: response.statusCode,
      latencyMs,
    })
  })
  next()
})
app.use('/api/auth', authLimiter)

app.use('/api', (request, response, next) => {
  if (request.path.startsWith('/auth')) {
    next()
    return
  }
  if (!authRequired) {
    next()
    return
  }
  authService.requireAuth(request, response, next)
})

if (mastraServerEnabled) {
  const [{ MastraServer }, { mastra }] = await Promise.all([
    import('@mastra/express'),
    import('../src/mastra/index.js'),
  ])
  const mastraServer = new MastraServer({ app, mastra })
  await mastraServer.init()
}

app.get('/api/health', async (_request, response) => {
  response.json(await getHealthSnapshot())
})

app.get('/api/ready', async (_request, response) => {
  const readiness = await checkDatabaseReadiness(databaseEngine, systemRepository, neo4jGraphStore)
  response.status(readiness.ready ? 200 : 503).json(readiness)
})

app.get('/api/notifications', async (_request, response) => {
  response.json(await notificationRepository.listNotifications())
})

app.get('/api/audit-logs', roleGuard('admin'), async (request, response) => {
  response.json(await auditRepository.listAuditLogs(Number(request.query.limit ?? 50)))
})

app.get('/api/users', roleGuard('admin'), async (_request, response) => {
  response.json(await authService.listUsers())
})

app.post('/api/users', roleGuard('admin'), async (request, response) => {
  const credentials = validateCredentials(request.body ?? {})
  if ('error' in credentials) {
    response.status(400).json({ error: credentials.error })
    return
  }

  const displayName = String(request.body?.displayName ?? '').trim()
  const role = String(request.body?.role ?? '')
  if (!displayName) {
    response.status(400).json({ error: 'Display name is required' })
    return
  }
  if (role !== 'support_agent' && role !== 'customer') {
    response.status(400).json({ error: 'New users can only be support agents or customers' })
    return
  }

  try {
    const user = await authService.createUser({ email: credentials.email, displayName, password: credentials.password, role })
    await recordAudit(request, { action: 'user.created', entityType: 'user', entityId: user?.id, metadata: { role } })
    response.status(201).json(user)
  } catch {
    response.status(409).json({ error: 'A user with this email already exists' })
  }
})

app.post('/api/notifications/read-all', async (_request, response) => {
  response.json({ markedRead: await notificationRepository.markAllNotificationsRead() })
})

app.post('/api/notifications/:id/read', async (request, response) => {
  const id = Number(request.params.id)
  if (!Number.isInteger(id) || id <= 0 || !await notificationRepository.markNotificationRead(id)) {
    response.status(404).json({ error: 'notification was not found' })
    return
  }
  response.json({ read: true })
})

app.get('/api/knowledge-graph/nodes', roleGuard('admin', 'support_agent'), async (_request, response) => {
  response.json(neo4jGraphStore ? await neo4jGraphStore.listNodes() : await graphRepository.listGraphNodes())
})

app.get('/api/knowledge-graph', roleGuard('admin', 'support_agent'), async (_request, response) => {
  response.json({
    nodes: neo4jGraphStore ? await neo4jGraphStore.listNodes() : await graphRepository.listGraphNodes(),
    relationships: neo4jGraphStore ? await neo4jGraphStore.listRelationships() : await graphRepository.listGraphRelationships(),
  })
})

app.get('/api/knowledge-graph/paths/:id', roleGuard('admin', 'support_agent'), async (request, response) => {
  const id = String(request.params.id)
  const node = neo4jGraphStore ? await neo4jGraphStore.getNode(id) : await graphRepository.getGraphNode(id)
  if (!node) {
    response.status(404).json({ error: 'graph node was not found' })
    return
  }
  response.json({ node, paths: neo4jGraphStore ? await neo4jGraphStore.queryPaths(id, Number(request.query.hops ?? 2)) : await graphRepository.queryGraphPaths(id, Number(request.query.hops ?? 2)) })
})

app.post('/api/knowledge-graph/nodes', roleGuard('admin', 'support_agent'), async (request, response) => {
  const id = String(request.body?.id ?? '').trim()
  const type = String(request.body?.type ?? '').trim()
  const properties = request.body?.properties && typeof request.body.properties === 'object' ? request.body.properties : {}
  if (!id || !['Customer', 'Order', 'Product', 'Payment', 'Refund', 'Delivery', 'Subscription', 'SupportIssue', 'SupportProcedure', 'KnowledgeDocument', 'SupportAgent'].includes(type)) {
    response.status(400).json({ error: 'stable id and valid ontology node type are required' })
    return
  }
  response.status(201).json(neo4jGraphStore
    ? await neo4jGraphStore.upsertNode({ id, type, properties })
    : await graphRepository.upsertGraphNode({ id, type: type as Parameters<typeof graphRepository.upsertGraphNode>[0]['type'], properties }))
  await recordAudit(request, { action: 'graph.node.created', entityType: 'graph_node', entityId: id, metadata: { type } })
})

app.post('/api/knowledge-graph/relationships', roleGuard('admin', 'support_agent'), async (request, response) => {
  const sourceId = String(request.body?.sourceId ?? '').trim()
  const targetId = String(request.body?.targetId ?? '').trim()
  const type = String(request.body?.type ?? '').trim()
  const sourceNode = neo4jGraphStore ? await neo4jGraphStore.getNode(sourceId) : await graphRepository.getGraphNode(sourceId)
  const targetNode = neo4jGraphStore ? await neo4jGraphStore.getNode(targetId) : await graphRepository.getGraphNode(targetId)
  if (!sourceId || !targetId || !type || !sourceNode || !targetNode) {
    response.status(400).json({ error: 'existing source and target nodes plus relationship type are required' })
    return
  }
  const created = neo4jGraphStore
    ? await neo4jGraphStore.createRelationship({ sourceId, targetId, type, properties: request.body?.properties ?? {} })
    : await graphRepository.createGraphRelationship({ sourceId, targetId, type, properties: request.body?.properties ?? {} })
  await recordAudit(request, { action: 'graph.relationship.created', entityType: 'graph_relationship', entityId: `${sourceId}:${type}:${targetId}`, metadata: { sourceId, targetId, type } })
  response.status(201).json(created)
})

app.delete('/api/knowledge-graph/relationships', roleGuard('admin', 'support_agent'), async (request, response) => {
  const sourceId = String(request.body?.sourceId ?? '').trim()
  const targetId = String(request.body?.targetId ?? '').trim()
  const type = String(request.body?.type ?? '').trim()
  if (!sourceId || !targetId || !type) {
    response.status(400).json({ error: 'source, target, and relationship type are required' })
    return
  }
  const deleted = neo4jGraphStore
    ? await neo4jGraphStore.deleteRelationship({ sourceId, targetId, type })
    : await graphRepository.deleteGraphRelationship({ sourceId, targetId, type })
  if (!deleted) {
    response.status(404).json({ error: 'graph relationship was not found' })
    return
  }
  await recordAudit(request, { action: 'graph.relationship.deleted', entityType: 'graph_relationship', entityId: `${sourceId}:${type}:${targetId}`, metadata: { sourceId, targetId, type } })
  response.json({ deleted: true })
})

app.delete('/api/knowledge-graph/nodes/:id', roleGuard('admin', 'support_agent'), async (request, response) => {
  const id = String(request.params.id).trim()
  const deleted = neo4jGraphStore ? await neo4jGraphStore.deleteNode(id) : await graphRepository.deleteGraphNode(id)
  if (!deleted) {
    response.status(404).json({ error: 'graph node was not found' })
    return
  }
  await recordAudit(request, { action: 'graph.node.deleted', entityType: 'graph_node', entityId: id })
  response.json({ deleted: true })
})

app.get('/api/integrations/webhooks', roleGuard('admin'), async (_request, response) => {
  response.json(await webhookService.listWebhookSubscriptions())
})

app.get('/api/integrations/webhooks/deliveries', roleGuard('admin'), async (request, response) => {
  response.json(await webhookService.listWebhookDeliveries(Number(request.query.limit ?? 30)))
})

app.post('/api/integrations/webhooks', roleGuard('admin'), async (request, response) => {
  const name = String(request.body?.name ?? '').trim()
  const url = String(request.body?.url ?? '').trim()
  const requestedEvents = Array.isArray(request.body?.events) ? request.body.events.map((event: unknown) => String(event)) : ['*']
  const events = normalizeWebhookEvents(requestedEvents)
  if (!name || name.length > 120 || url.length > 2048 || !validateWebhookUrl(url) || requestedEvents.some((event: string) => event !== '*' && !webhookEvents.some((allowedEvent) => allowedEvent === event))) {
    response.status(400).json({ error: 'name and an HTTPS webhook URL are required' })
    return
  }
  try {
    const created = await webhookService.createWebhookSubscription({ name, url, events })
    await recordAudit(request, { action: 'webhook.created', entityType: 'webhook', entityId: created.id, metadata: { name, events } })
    response.status(201).json(created)
  } catch {
    response.status(409).json({ error: 'a webhook with this URL already exists' })
  }
})

app.delete('/api/integrations/webhooks/:id', roleGuard('admin'), async (request, response) => {
  const id = Number(request.params.id)
  if (!Number.isInteger(id) || id <= 0 || !await webhookService.deleteWebhookSubscription(id)) {
    response.status(404).json({ error: 'webhook was not found' })
    return
  }
  await recordAudit(request, { action: 'webhook.deleted', entityType: 'webhook', entityId: id })
  response.json({ deleted: true })
})

app.patch('/api/integrations/webhooks/:id', roleGuard('admin'), async (request, response) => {
  const id = Number(request.params.id)
  if (!Number.isInteger(id) || id <= 0 || typeof request.body?.active !== 'boolean' || !await webhookService.updateWebhookSubscription(id, request.body.active)) {
    response.status(400).json({ error: 'a valid webhook id and boolean active value are required' })
    return
  }
  await recordAudit(request, { action: request.body.active ? 'webhook.activated' : 'webhook.paused', entityType: 'webhook', entityId: id, metadata: { active: request.body.active } })
  response.json({ updated: true, active: request.body.active })
})

app.post('/api/integrations/webhooks/:id/test', roleGuard('admin'), async (request, response) => {
  const id = Number(request.params.id)
  if (!Number.isInteger(id) || id <= 0) {
    response.status(404).json({ error: 'webhook was not found' })
    return
  }
  const delivered = await webhookService.testWebhookSubscription(id)
  if (delivered === undefined) {
    response.status(404).json({ error: 'webhook was not found' })
    return
  }
  if (!delivered) {
    await recordAudit(request, { action: 'webhook.test_failed', entityType: 'webhook', entityId: id, metadata: { event: 'knowledge.indexed' } })
    response.status(502).json({ delivered: false, error: 'webhook test delivery failed; check delivery history' })
    return
  }
  await recordAudit(request, { action: 'webhook.test_delivered', entityType: 'webhook', entityId: id, metadata: { event: 'knowledge.indexed' } })
  response.json({ delivered: true, event: 'knowledge.indexed' })
})

app.post('/api/auth/bootstrap', async (request, response) => {
  if (await authService.getUserCount() > 0) {
    response.status(409).json({ error: 'Authentication has already been initialized' })
    return
  }

  const credentials = validateCredentials(request.body ?? {})
  if ('error' in credentials) {
    response.status(400).json({ error: credentials.error })
    return
  }

  const displayName = String(request.body?.displayName ?? '').trim()
  if (!displayName) {
    response.status(400).json({ error: 'Display name is required' })
    return
  }

  const user = await authService.createUser({
    email: credentials.email,
    displayName,
    password: credentials.password,
    role: 'admin',
  })
  if (!user) {
    response.status(500).json({ error: 'Unable to create the administrator account' })
    return
  }
  response.status(201).json({ user, ...(await authService.createSession(user)) })
})

app.post('/api/auth/login', async (request, response) => {
  const credentials = validateCredentials(request.body ?? {})
  if ('error' in credentials) {
    response.status(400).json({ error: credentials.error })
    return
  }

  const user = await authService.authenticateUser(credentials.email, credentials.password)
  if (!user) {
    response.status(401).json({ error: 'Invalid email or password' })
    return
  }
  response.json({ user, ...(await authService.createSession(user)) })
})

app.post('/api/auth/password', authService.requireAuth, async (request, response) => {
  const user = authService.getAuthenticatedUser(request)
  const currentPassword = String(request.body?.currentPassword ?? '')
  const nextPassword = String(request.body?.newPassword ?? '')
  if (!user || currentPassword.length === 0) {
    response.status(400).json({ error: 'Current password is required' })
    return
  }
  if (nextPassword.length < 8) {
    response.status(400).json({ error: 'New password must contain at least 8 characters' })
    return
  }
  if (currentPassword === nextPassword) {
    response.status(400).json({ error: 'New password must be different from the current password' })
    return
  }
  if (!await authService.changeUserPassword(user.id, currentPassword, nextPassword)) {
    response.status(401).json({ error: 'Current password is incorrect' })
    return
  }
  await recordAudit(request, { action: 'user.password_changed', entityType: 'user', entityId: user.id })
  response.status(204).send()
})

app.get('/api/auth/me', authService.requireAuth, (request, response) => {
  response.json({ user: authService.getAuthenticatedUser(request) })
})

app.post('/api/auth/logout', authService.requireAuth, async (request, response) => {
  const token = getBearerToken(request)
  if (token) await authService.revokeSession(token)
  response.status(204).send()
})

app.get('/api/system-status', async (_request, response) => {
  const health = await getHealthSnapshot()
  const knowledge = await knowledgeRepository.listKnowledge()
  const indexedKnowledge = knowledge.filter((item) => item.status === 'indexed').length
  const recordCounts = await systemRepository.getRecordCounts()
  const sourceStats = await knowledgeRepository.getKnowledgeSourceFeedbackStats()

  response.json({
    generatedAt: new Date().toISOString(),
    backend: {
      service: health.service,
      status: health.status,
      apiBase: `http://127.0.0.1:${port}/api`,
    },
    database: {
      engine: health.database,
      status: 'active',
      conversations: recordCounts.conversations,
      feedbackRecords: recordCounts.feedbackRecords,
      knowledgeRecords: knowledge.length,
      indexedKnowledgeRecords: indexedKnowledge,
    },
    graphStore: health.graphStore,
    retrieval: health.retrieval,
    ai: {
      agentProvider: health.agentProvider,
      mastraReady: health.mastraReady,
      mastraServerEnabled: health.mastraServerEnabled,
      mastraRuntime: health.mastraRuntime,
      mastraEndpointConfigured: health.mastraEndpointConfigured,
      model: health.mastraModel,
      llmProvider: health.llmProvider,
      providerConfigured: health.llmProviderConfigured,
    },
    learning: {
      trackedSources: sourceStats.length,
      learnedSources: sourceStats.filter((source) => calculateFeedbackAdjustment(source) !== 0).length,
    },
  })
})

app.get('/api/metrics', roleGuard('admin'), (_request, response) => {
  response.json(getRuntimeMetrics())
})

app.get('/api/interim-status', (_request, response) => {
  response.json({
    milestone: 'Current implementation status',
    readyForDemo: true,
    completed: [
      'React frontend with agent, customer, knowledge, and analytics views',
      'Express API connected to the frontend',
      'SQLite persistence for conversations, messages, feedback, and knowledge',
      'Knowledge-grounded response generation with confidence and source tracking',
      'Semantic vector retrieval with automatic keyword fallback',
      'Feedback capture from customer ratings and agent actions',
      'Analytics calculated from persisted database records',
      'Persisted customer conversation memory with recent history in Agent Workspace',
      'Authentication, role-based access, and protected API routes',
      'Containerized production build with CI and browser/API verification',
      'Mastra-compatible remote agent endpoint configured through MASTRA_AGENT_URL',
      'Local Mastra server can be enabled with ENABLE_MASTRA_SERVER=true',
      'Embedded Mastra agent can serve the main chat flow with automatic local fallback',
      'Registered Mastra support-response workflow for Studio discovery and execution',
      'Signed webhook integrations with delivery retries, testing, audit logs, and pause/resume controls',
      'PostgreSQL runtime selection with migration, backup/restore, and CI smoke verification',
      'Hosted PostgreSQL configuration preflight, verification, and rollback runbook',
    ],
    pendingForFinal: [
      'Managed PostgreSQL deployment execution and monitored rollout',
      'Optional external channel integrations and hosted Mastra Studio operations',
    ],
  })
})

async function processChatRequest(query: string, requestedConversationId: number, language: string) {
  const startedAt = Date.now()
  const now = new Date().toISOString()
  let conversationId = Number.isInteger(requestedConversationId) ? requestedConversationId : 0

  if (!conversationId) {
    const subject = query.length > 48 ? `${query.slice(0, 45)}...` : query
    const created = await conversationRepository.createConversation({
      customerName: 'Demo Customer', subject, status: 'open', priority: 'normal', topic: inferTopic(query),
      assignedTo: null, tags: [], escalated: false, createdAt: now, updatedAt: now,
    })
    conversationId = created.id
  }

  const customerMessageId = crypto.randomUUID()
  await conversationRepository.appendMessage({ id: customerMessageId, conversationId, role: 'customer', content: query, createdAt: now, shouldEscalate: false })

  const result = await agent.generateResponse(query, language)
  const latencyMs = Math.max(0, Date.now() - startedAt)
  const assistantMessageId = crypto.randomUUID()
  const assistantCreatedAt = new Date().toISOString()

  await conversationRepository.appendMessage({
    id: assistantMessageId, conversationId, role: 'assistant', content: result.answer,
    confidence: result.confidence, sources: result.sources, sourceScores: result.sourceScores,
    retrievalMethod: result.retrievalMethod, generationProvider: result.generationProvider,
    latencyMs, shouldEscalate: result.shouldEscalate, createdAt: assistantCreatedAt,
  })
  await conversationRepository.updateConversation(conversationId, { topic: inferTopic(query) })
  for (const source of result.sources) {
    await knowledgeRepository.incrementKnowledgeUses(source)
  }
  if (result.shouldEscalate) {
    await createNotification({ kind: 'escalation', title: 'Conversation needs human review', message: 'ARIA flagged this conversation for support-agent follow-up.' })
  }

  return {
    id: assistantMessageId,
    conversationId,
    role: 'assistant',
    createdAt: assistantCreatedAt,
    latencyMs,
    ...result,
  }
}

function parseChatRequest(request: express.Request) {
  const query = String(request.body?.message ?? '').trim()
  const requestedConversationId = Number(request.body?.conversationId)
  const requestedLanguage = String(request.body?.language ?? 'en').toLowerCase()
  const language = ['en', 'hi', 'es'].includes(requestedLanguage) ? requestedLanguage : 'en'
  return { query, requestedConversationId, language }
}

app.post('/api/chat', chatLimiter, async (request, response) => {
  const { query, requestedConversationId, language } = parseChatRequest(request)
  if (!query) {
    response.status(400).json({ error: 'message is required' })
    return
  }
  response.json(await processChatRequest(query, requestedConversationId, language))
})

app.post('/api/chat/stream', chatLimiter, async (request, response) => {
  const { query, requestedConversationId, language } = parseChatRequest(request)
  if (!query) {
    response.status(400).json({ error: 'message is required' })
    return
  }

  response.setHeader('Content-Type', 'text/event-stream')
  response.setHeader('Cache-Control', 'no-cache')
  response.setHeader('Connection', 'keep-alive')
  try {
    const result = await processChatRequest(query, requestedConversationId, language)
    const chunks = result.answer.match(/\S+\s*/g) ?? [result.answer]
    for (const chunk of chunks) {
      response.write(`data: ${JSON.stringify({ type: 'chunk', text: chunk })}\n\n`)
    }
    response.write(`data: ${JSON.stringify({ type: 'complete', response: result })}\n\n`)
  } catch (error) {
    const requestId = String(response.getHeader('X-Request-ID') ?? 'unknown')
    const message = error instanceof Error ? error.message : 'Streaming response failed'
    console.error(`[${requestId}] ${request.method} ${request.originalUrl} failed: ${message}`)
    response.write(`data: ${JSON.stringify({ type: 'error', message: 'ARIA could not complete the response.', requestId })}\n\n`)
  }
  response.end()
})

app.get('/api/conversations', async (_request, response) => {
  const rows = (await conversationRepository.listConversations()).map(({ customerName, ...item }) => ({ ...item, customer: customerName }))
  response.json(rows)
})

app.get('/api/support-agents', roleGuard('admin', 'support_agent'), async (_request, response) => {
  response.json(await authService.listSupportAgents())
})

app.get('/api/conversations/page', async (request, response) => {
  const limit = Math.min(Math.max(Number(request.query.limit ?? 50) || 50, 1), 100)
  const offset = Math.max(Number(request.query.offset ?? 0) || 0, 0)
  const search = String(request.query.q ?? '').trim()
  const { items, total, queueCounts } = await conversationRepository.listConversationPage(limit, offset, search)
  const rows = items.map(({ customerName, ...item }) => ({ ...item, customer: customerName }))
  response.json({ items: rows, total, limit, offset, search, hasMore: offset + rows.length < total, queueCounts })
})

app.patch('/api/conversations/:id', roleGuard('admin', 'support_agent'), async (request, response) => {
  const id = Number(request.params.id)
  const status = request.body?.status ? String(request.body.status).toLowerCase() : undefined
  const priority = request.body?.priority ? String(request.body.priority).toLowerCase() : undefined
  const assignedTo = request.body?.assignedTo === null ? null : request.body?.assignedTo ? String(request.body.assignedTo).trim() : undefined
  const tags = Array.isArray(request.body?.tags) ? request.body.tags.map((tag: unknown) => String(tag).trim()).filter(Boolean).slice(0, 8) : undefined
  const escalated = typeof request.body?.escalated === 'boolean' ? request.body.escalated : undefined

  if (!Number.isInteger(id) || id <= 0 || (status && !['open', 'pending', 'resolved'].includes(status)) || (priority && !['high', 'normal'].includes(priority))) {
    response.status(400).json({ error: 'valid conversation metadata is required' })
    return
  }

  const current = await conversationRepository.getConversation(id)
  if (!current) {
    response.status(404).json({ error: 'conversation was not found' })
    return
  }
  const updated = await conversationRepository.updateConversation(id, { status: status as ConversationStatus | undefined, priority: priority as ConversationPriority | undefined, assignedTo, tags, escalated })
  if (!updated) {
    response.status(404).json({ error: 'conversation was not found' })
    return
  }
  const conversationChange = escalated !== undefined
    ? (escalated ? 'marked for escalation' : 'removed from escalation')
    : status
      ? `moved to ${status}`
      : priority
        ? `set to ${priority} priority`
        : assignedTo !== undefined
          ? (assignedTo ? `assigned to ${assignedTo}` : 'returned to the unassigned queue')
          : 'metadata updated'
  await createNotification({ kind: 'conversation', title: 'Conversation updated', message: `${updated.customerName} was ${conversationChange}.` })
  await recordAudit(request, { action: 'conversation.updated', entityType: 'conversation', entityId: id, metadata: { status, priority, assignedTo, escalated } })
  response.json({ ...updated, customer: updated.customerName })
})

app.get('/api/conversations/:id/context', roleGuard('admin', 'support_agent'), async (request, response) => {
  const id = Number(request.params.id)
  const context = await conversationRepository.getCustomerContext(id)
  if (!context) {
    response.status(404).json({ error: 'conversation was not found' })
    return
  }
  response.json({
    ...context,
    history: context.history.map((item) => ({ ...item, customer: item.customerName })),
  })
})

app.get('/api/conversations/:id/export', roleGuard('admin', 'support_agent'), async (request, response) => {
  const id = Number(request.params.id)
  if (!Number.isInteger(id) || id <= 0) {
    response.status(400).json({ error: 'a valid conversation id is required' })
    return
  }

  const conversation = await conversationRepository.getConversation(id)
  if (!conversation) {
    response.status(404).json({ error: 'conversation was not found' })
    return
  }

  const messages = await conversationRepository.listMessages(id)

  const lines = [
    'ARIA Conversation Export',
    '========================',
    `Customer: ${conversation.customerName}`,
    `Subject: ${conversation.subject}`,
    `Status: ${conversation.status}`,
    `Priority: ${conversation.priority}`,
    `Topic: ${conversation.topic}`,
    `Assigned to: ${conversation.assignedTo ?? 'Unassigned'}`,
    `Created: ${conversation.createdAt}`,
    `Updated: ${conversation.updatedAt}`,
    '',
    'Messages',
    '--------',
    ...messages.flatMap((message) => [`[${message.createdAt}] ${message.role}`, message.content, '']),
  ]

  response.setHeader('Content-Type', 'text/plain; charset=utf-8')
  response.setHeader('Content-Disposition', `attachment; filename="aria-conversation-${id}.txt"`)
  response.send(lines.join('\n'))
})

app.get('/api/conversations/:id/messages', async (request, response) => {
  response.json(await conversationRepository.listMessages(Number(request.params.id)))
})

app.post('/api/feedback', async (request, response) => {
  const messageId = String(request.body?.messageId ?? '')
  const conversationId = Number(request.body?.conversationId)
  const rating = request.body?.rating ? Number(request.body.rating) : undefined
  const feedbackType = String(request.body?.feedbackType ?? 'customer_rating')

  if (!messageId || !conversationId) {
    response.status(400).json({ error: 'messageId and conversationId are required' })
    return
  }

  const entry = {
    id: crypto.randomUUID(),
    messageId,
    conversationId,
    rating,
    feedbackType,
    comment: request.body?.comment ? String(request.body.comment) : null,
    editedResponse: request.body?.editedResponse ? String(request.body.editedResponse) : null,
    qualityScore: calculateQualityScore(rating, feedbackType),
    createdAt: new Date().toISOString(),
  }

  await feedbackRepository.insertFeedback(entry)
  if (rating !== undefined && rating <= 2) {
    await createNotification({ kind: 'feedback', title: 'Low customer rating', message: `A response received a ${rating}/5 rating and may need review.` })
    notifyWebhook('feedback.low_rating', { rating, conversationId, messageId })
  }
  response.status(201).json(entry)
})

app.post('/api/agent-actions', roleGuard('admin', 'support_agent'), async (request, response) => {
  const conversationId = Number(request.body?.conversationId)
  const action = String(request.body?.action ?? '')
  const editedResponse = request.body?.editedResponse ? String(request.body.editedResponse) : null

  if (!conversationId || !['accepted', 'edited', 'rejected'].includes(action)) {
    response.status(400).json({ error: 'valid conversationId and action are required' })
    return
  }

  let messageId = await conversationRepository.getLatestAssistantMessageId(conversationId)

  if (!messageId) {
    messageId = crypto.randomUUID()
    await conversationRepository.appendMessage({
      id: messageId, conversationId, role: 'assistant',
      content: editedResponse ?? 'ARIA agent-assist suggestion', confidence: 0.92,
      sources: [], shouldEscalate: false, createdAt: new Date().toISOString(),
    })
  }

  const entry = {
    id: crypto.randomUUID(),
    messageId,
    conversationId,
    feedbackType: action,
    editedResponse,
    qualityScore: calculateQualityScore(undefined, action),
    createdAt: new Date().toISOString(),
  }
  await feedbackRepository.insertFeedback(entry)
  if (action === 'rejected' || action === 'edited') {
    await createNotification({ kind: 'agent-action', title: action === 'rejected' ? 'AI response rejected' : 'AI response edited', message: 'An agent correction was recorded for future review.' })
    notifyWebhook('agent_action.corrected', { action, conversationId })
  }

  await recordAudit(request, { action: `agent.${action}`, entityType: 'conversation', entityId: conversationId, metadata: { feedbackType: action } })

  response.status(201).json(entry)
})

app.get('/api/knowledge', async (_request, response) => {
  response.json(await knowledgeRepository.listKnowledge())
})

app.get('/api/knowledge/archived', roleGuard('admin', 'support_agent'), async (_request, response) => {
  response.json(await knowledgeRepository.listArchivedKnowledge())
})

app.post('/api/knowledge', roleGuard('admin', 'support_agent'), async (request, response) => {
  const title = String(request.body?.title ?? '').trim()
  const category = String(request.body?.category ?? '').trim()
  const content = String(request.body?.content ?? '').trim()
  const status = String(request.body?.status ?? 'indexed').trim().toLowerCase()

  if (!title || !category || !content) {
    response.status(400).json({ error: 'title, category, and content are required' })
    return
  }

  if (!['indexed', 'review'].includes(status)) {
    response.status(400).json({ error: 'status must be indexed or review' })
    return
  }

  try {
    const document = await knowledgeRepository.createKnowledgeDocument({ title, category, content, status })
    await createNotification({ kind: 'knowledge', title: 'Knowledge document created', message: `${document.title} was added to the knowledge base.` })
    await recordAudit(request, { action: 'knowledge.created', entityType: 'knowledge_document', entityId: document.id, metadata: { category, status } })
    response.status(201).json(document)
  } catch {
    response.status(409).json({ error: 'a knowledge document with this title already exists' })
  }
})

app.post('/api/knowledge/upload', roleGuard('admin', 'support_agent'), upload.single('file'), async (request, response) => {
  if (!request.file) {
    response.status(400).json({ error: 'a PDF, DOCX, TXT, or CSV file is required' })
    return
  }

  const type = getDocumentType(request.file.originalname, request.file.mimetype)
  if (!type) {
    response.status(415).json({ error: 'unsupported file type; use PDF, DOCX, TXT, or CSV' })
    return
  }

  const title = String(request.body?.title ?? request.file.originalname.replace(/\.[^.]+$/, '')).trim()
  const category = String(request.body?.category ?? 'FAQ').trim()
  if (!title || !category) {
    response.status(400).json({ error: 'title and category are required' })
    return
  }

  try {
    const content = await extractDocumentText(request.file.buffer, type)
    if (!content) {
      response.status(422).json({ error: 'no readable text was found in the uploaded file' })
      return
    }

    const embeddingText = createKnowledgeEmbeddingText({ title, category, content })
    const embeddingService = new LocalEmbeddingService()
    let vector: number[]
    try {
      vector = await embeddingService.embed(embeddingText)
    } finally {
      await embeddingService.dispose()
    }

    const document = await knowledgeRepository.createKnowledgeDocumentWithEmbedding({
      title,
      category,
      content,
      status: 'indexed',
      sourceFilename: request.file.originalname,
    }, {
      model: embeddingModel,
      vector,
      contentHash: createContentHash(embeddingText),
    })

    await createNotification({ kind: 'knowledge', title: 'Knowledge document indexed', message: `${request.file.originalname} is ready for retrieval.` })
    notifyWebhook('knowledge.indexed', { title: document.title, sourceFilename: request.file.originalname })
    await recordAudit(request, { action: 'knowledge.uploaded', entityType: 'knowledge_document', entityId: document.id, metadata: { category, sourceFilename: request.file.originalname } })
    response.status(201).json({ ...document, indexed: true, sourceFilename: request.file.originalname })
  } catch (error) {
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      response.status(409).json({ error: 'a knowledge document with this title already exists' })
      return
    }
    response.status(422).json({ error: error instanceof Error ? error.message : 'the document could not be processed' })
  }
})

app.put('/api/knowledge/:id', roleGuard('admin', 'support_agent'), async (request, response) => {
  const id = Number(request.params.id)
  const title = String(request.body?.title ?? '').trim()
  const category = String(request.body?.category ?? '').trim()
  const content = String(request.body?.content ?? '').trim()
  const status = String(request.body?.status ?? 'indexed').trim().toLowerCase()
  if (!Number.isInteger(id) || id <= 0 || !title || !category || !content) {
    response.status(400).json({ error: 'id, title, category, and content are required' })
    return
  }
  if (!['indexed', 'review'].includes(status)) {
    response.status(400).json({ error: 'status must be indexed or review' })
    return
  }
  try {
    const updated = await knowledgeRepository.updateKnowledgeDocument(id, { title, category, content, status })
    if (!updated) {
      response.status(404).json({ error: 'knowledge document was not found' })
      return
    }
    if (status === 'indexed') {
      const embeddingService = new LocalEmbeddingService()
      try {
        const embeddingText = createKnowledgeEmbeddingText(updated)
        const vector = await embeddingService.embed(embeddingText)
        await knowledgeRepository.upsertKnowledgeEmbedding({
          knowledgeDocumentId: updated.id,
          model: embeddingModel,
          vector,
          contentHash: createContentHash(embeddingText),
        })
      } finally {
        await embeddingService.dispose()
      }
    }
    await createNotification({ kind: 'knowledge', title: 'Knowledge document updated', message: `${updated.title} was saved and re-indexed for retrieval.` })
    await recordAudit(request, { action: 'knowledge.updated', entityType: 'knowledge_document', entityId: id, metadata: { category, status } })
    response.json({ ...updated, indexed: status === 'indexed', reindexRequired: false })
  } catch {
    response.status(409).json({ error: 'a knowledge document with this title already exists' })
  }
})

app.get('/api/knowledge/:id/versions', roleGuard('admin', 'support_agent'), async (request, response) => {
  const id = Number(request.params.id)
  if (!Number.isInteger(id) || id <= 0) {
    response.status(400).json({ error: 'valid knowledge id is required' })
    return
  }
  response.json(await knowledgeRepository.getKnowledgeDocumentVersions(id))
})

app.post('/api/knowledge/archive', roleGuard('admin', 'support_agent'), async (request, response) => {
  const ids = Array.isArray(request.body?.ids) ? request.body.ids.map((id: unknown) => Number(id)) : []
  if (ids.length === 0 || ids.some((id: number) => !Number.isInteger(id) || id <= 0)) {
    response.status(400).json({ error: 'ids must be a non-empty array of knowledge ids' })
    return
  }
  const result = await knowledgeRepository.archiveKnowledgeDocuments(ids)
  if (result.archived > 0) {
    await createNotification({ kind: 'knowledge', title: 'Knowledge documents archived', message: `${result.archived} knowledge document${result.archived === 1 ? '' : 's'} moved to the archive.` })
    await recordAudit(request, { action: 'knowledge.archived', entityType: 'knowledge_document', metadata: { ids } })
  }
  response.json(result)
})

app.post('/api/knowledge/restore', roleGuard('admin', 'support_agent'), async (request, response) => {
  const ids = Array.isArray(request.body?.ids) ? request.body.ids.map((id: unknown) => Number(id)) : []
  if (ids.length === 0 || ids.some((id: number) => !Number.isInteger(id) || id <= 0)) {
    response.status(400).json({ error: 'ids must be a non-empty array of knowledge ids' })
    return
  }
  const result = await knowledgeRepository.restoreKnowledgeDocuments(ids)
  if (result.restored > 0) {
    await createNotification({ kind: 'knowledge', title: 'Knowledge documents restored', message: `${result.restored} archived knowledge document${result.restored === 1 ? '' : 's'} restored.` })
    await recordAudit(request, { action: 'knowledge.restored', entityType: 'knowledge_document', metadata: { ids } })
  }
  response.json(result)
})

app.delete('/api/knowledge/:id', roleGuard('admin', 'support_agent'), async (request, response) => {
  const id = Number(request.params.id)

  if (!Number.isInteger(id) || id <= 0) {
    response.status(400).json({ error: 'valid knowledge id is required' })
    return
  }

  const result = await knowledgeRepository.deleteKnowledgeDocuments([id])
  if (result.deleted === 0) {
    response.status(404).json({ error: 'knowledge document was not found' })
    return
  }

  await recordAudit(request, { action: 'knowledge.deleted', entityType: 'knowledge_document', entityId: id })
  response.json(result)
})

app.delete('/api/knowledge', roleGuard('admin', 'support_agent'), async (request, response) => {
  const ids = Array.isArray(request.body?.ids)
    ? request.body.ids.map((id: unknown) => Number(id))
    : []

  if (ids.length === 0 || ids.some((id: number) => !Number.isInteger(id) || id <= 0)) {
    response.status(400).json({ error: 'ids must be a non-empty array of knowledge ids' })
    return
  }

  const result = await knowledgeRepository.deleteKnowledgeDocuments(ids)
  if (result.deleted > 0) {
    await createNotification({ kind: 'knowledge', title: 'Knowledge documents deleted', message: `${result.deleted} knowledge document${result.deleted === 1 ? '' : 's'} permanently deleted.` })
    await recordAudit(request, { action: 'knowledge.deleted', entityType: 'knowledge_document', metadata: { ids } })
  }
  response.json(result)
})

app.get('/api/analytics/summary', async (request, response) => {
  const range = String(request.query.range ?? '7d')
  const since = range === 'all' ? undefined : new Date(Date.now() - (range === '30d' ? 30 : 7) * 24 * 60 * 60 * 1000).toISOString()
  const { conversationCount, feedbackStats, accepted, corrected, topicRows, rejected, retrievalRows, providerRows, escalationCount, responseMessageCount, latencyStats, confidenceStats, groundedResponseCount, highConfidenceCount, lowConfidenceCount, qualityTrend } = await analyticsRepository.getAnalyticsMetrics(since, Number(process.env.AI_CONFIDENCE_THRESHOLD ?? 0.7))
  const sourceStats = await knowledgeRepository.getKnowledgeSourceFeedbackStats()
  const adaptedSources = sourceStats.map((source) => ({
    title: source.title,
    feedbackCount: source.feedbackCount,
    averageQuality: Math.round(source.averageQuality),
    averageRating: Number(source.averageRating.toFixed(1)),
    acceptedCount: source.acceptedCount,
    editedCount: source.editedCount,
    rejectedCount: source.rejectedCount,
    feedbackAdjustment: Number(calculateFeedbackAdjustment(source).toFixed(4)),
  }))
  const learnedSourceCount = adaptedSources.filter((source) => source.feedbackAdjustment !== 0).length
  const strongestSources = adaptedSources
    .filter((source) => source.feedbackCount > 0)
    .sort((first, second) => (
      second.averageQuality - first.averageQuality
      || second.feedbackCount - first.feedbackCount
    ))
    .slice(0, 3)
  const reviewSources = adaptedSources
    .filter((source) => source.averageQuality < neutralQualityScore || source.editedCount > 0 || source.rejectedCount > 0)
    .sort((first, second) => (
      first.averageQuality - second.averageQuality
      || second.rejectedCount - first.rejectedCount
      || second.editedCount - first.editedCount
    ))
    .slice(0, 3)
  const agentActionCount = accepted.count + corrected.count + rejected.count
  const escalationRate = responseMessageCount.count ? Math.round((escalationCount.count / responseMessageCount.count) * 100) : 0

  response.json({
    range,
    generatedAt: new Date().toISOString(),
    conversations: conversationCount.count,
    averageRating: Number(feedbackStats.averageRating.toFixed(1)),
    averageQuality: Math.round(feedbackStats.averageQuality),
    acceptanceRate: feedbackStats.count ? Math.round((accepted.count / feedbackStats.count) * 100) : 0,
    correctionRate: feedbackStats.count ? Math.round((corrected.count / feedbackStats.count) * 100) : 0,
    feedbackRecords: feedbackStats.count,
    retrieval: retrievalRows,
    providers: providerRows,
    escalations: escalationCount.count,
    escalationRate,
    assistantResponses: responseMessageCount.count,
    averageLatencyMs: Math.round(latencyStats.averageLatencyMs),
    averageConfidence: Number(confidenceStats.averageConfidence.toFixed(3)),
    qualityReport: {
      groundedResponses: groundedResponseCount.count,
      groundedResponseRate: responseMessageCount.count ? Math.round((groundedResponseCount.count / responseMessageCount.count) * 100) : 0,
      highConfidenceResponses: highConfidenceCount.count,
      highConfidenceRate: responseMessageCount.count ? Math.round((highConfidenceCount.count / responseMessageCount.count) * 100) : 0,
      lowConfidenceResponses: lowConfidenceCount.count,
      reviewSourceCount: reviewSources.length,
    },
    qualityTrend: qualityTrend.map((item) => ({
      day: item.day.slice(5),
      quality: Math.round(item.quality),
      rating: Number(item.rating.toFixed(1)),
    })),
    topics: topicRows,
    learningSignals: {
      learnedSourceCount,
      trackedSourceCount: adaptedSources.length,
      agentActionCount,
      averageSourceQuality: adaptedSources.length
        ? Math.round(adaptedSources.reduce((total, source) => total + source.averageQuality, 0) / adaptedSources.length)
        : 0,
    },
    strongestSources,
    reviewSources,
  })
})

const frontendDist = resolve('dist')
if (process.env.NODE_ENV === 'production' && existsSync(frontendDist)) {
  app.use(express.static(frontendDist))
  app.use((request, response, next) => {
    if (request.method !== 'GET' || request.path.startsWith('/api')) {
      next()
      return
    }
    response.sendFile(resolve(frontendDist, 'index.html'), (error) => {
      if (error) next(error)
    })
  })
}

app.use((error: unknown, request: express.Request, response: express.Response, _next: express.NextFunction) => {
  void _next
  const requestId = String(response.getHeader('X-Request-ID') ?? 'unknown')
  const message = errorMessage(error)
  logEvent('error', 'http.error', { requestId, method: request.method, route: request.originalUrl, message })
  if (response.headersSent) return
  response.status(500).json({ error: 'internal server error', requestId })
})

const server = app.listen(port, () => {
  logEvent('info', 'server.started', { address: `http://127.0.0.1:${port}`, database: databaseEngine, graphStore: neo4jGraphStore ? 'neo4j' : 'sqlite' })
})

let shuttingDown = false

async function shutdown(signal: NodeJS.Signals) {
  if (shuttingDown) return
  shuttingDown = true
  logEvent('info', 'server.shutdown.start', { signal })

  try {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve())
    })
    await runtimeRepositories.close()
    await neo4jGraphStore?.close()
    if (databaseEngine === 'sqlite') db.close()
    logEvent('info', 'server.shutdown.complete', { signal })
  } catch (error) {
    logEvent('error', 'server.shutdown.failed', { signal, message: errorMessage(error) })
    process.exitCode = 1
  }
}

process.once('SIGINT', () => void shutdown('SIGINT'))
process.once('SIGTERM', () => void shutdown('SIGTERM'))
