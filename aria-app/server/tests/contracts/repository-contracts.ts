import assert from 'node:assert/strict'
import type { AsyncConversationRepository, ConversationRepository } from '../../repositories/conversation-repository.js'
import type { AsyncFeedbackRepository, FeedbackRecord, FeedbackRepository } from '../../repositories/feedback-repository.js'
import type { AsyncGraphRepository, GraphRepository } from '../../repositories/graph-repository.js'
import type { AsyncKnowledgeRepository, KnowledgeRepository } from '../../repositories/knowledge-repository.js'
import type { AsyncNotificationRepository, NotificationRepository } from '../../repositories/notification-repository.js'
import type { AsyncAuditRepository, AuditRepository } from '../../repositories/audit-repository.js'
import type { AsyncAuthRepository, AuthRepository } from '../../repositories/auth-repository.js'
import type { AnalyticsRepository, AsyncAnalyticsRepository } from '../../repositories/analytics-repository.js'

type ConversationContractRepository = ConversationRepository | AsyncConversationRepository
type AuditContractRepository = AuditRepository | AsyncAuditRepository
type AuthContractRepository = AuthRepository | AsyncAuthRepository
type AnalyticsContractRepository = AnalyticsRepository | AsyncAnalyticsRepository
type FeedbackContractRepository = FeedbackRepository | AsyncFeedbackRepository
type GraphContractRepository = GraphRepository | AsyncGraphRepository
type KnowledgeContractRepository = KnowledgeRepository | AsyncKnowledgeRepository
type NotificationContractRepository = NotificationRepository | AsyncNotificationRepository

export async function runAuditRepositoryContract(repository: AuditContractRepository, prefix: string) {
  const metadata = { active: false, count: 0, events: ['contract.created'], details: { attempts: 3 } }
  const entry = await repository.createAuditLog({
    actorEmail: `${prefix}@example.com`, action: `${prefix}.created`, entityType: 'contract', entityId: 0, metadata,
  })
  const stored = (await repository.listAuditLogs(100)).find((item) => item.id === entry.id)
  assert.ok(stored)
  assert.equal(stored.actorUserId, null)
  assert.equal(stored.actorEmail, `${prefix}@example.com`)
  assert.equal(stored.action, `${prefix}.created`)
  assert.equal(stored.entityType, 'contract')
  assert.equal(stored.entityId, '0')
  assert.deepEqual(stored.metadata, metadata)
  assert.equal(stored.createdAt, entry.createdAt)

  const minimal = await repository.createAuditLog({ action: `${prefix}.minimal`, entityType: 'contract' })
  const defaults = (await repository.listAuditLogs(100)).find((item) => item.id === minimal.id)
  assert.ok(defaults)
  assert.equal(defaults.actorUserId, null)
  assert.equal(defaults.actorEmail, 'local-demo')
  assert.equal(defaults.entityId, null)
  assert.deepEqual(defaults.metadata, {})
  assert.equal((await repository.listAuditLogs(1)).length, 1)
}

export async function runAuthRepositoryContract(repository: AuthContractRepository, prefix: string) {
  await repository.ensureSchema()
  const now = '2026-01-01T00:00:00.000Z'
  const expiresAt = '2026-01-01T08:00:00.000Z'
  const email = `${prefix}@example.com`
  const credentials = { passwordHash: `${prefix}-hash`, passwordSalt: `${prefix}-salt` }
  const input = {
    id: 0, email, displayName: `${prefix} Support`, role: 'support_agent' as const,
    ...credentials, createdAt: now, updatedAt: now,
  }
  const before = await repository.countUsers()
  const id = await repository.insertUser(input)
  const publicUser = { id, email, displayName: input.displayName, role: input.role }

  assert.equal(await repository.countUsers(), before + 1)
  const foundById = await repository.findUserById(id)
  const foundByEmail = await repository.findUserByEmail(email.toUpperCase())
  const foundCredentials = await repository.findCredentialsByUserId(id)
  assert.deepEqual(foundById ? { ...foundById } : foundById, publicUser)
  assert.deepEqual(foundByEmail ? { ...foundByEmail } : foundByEmail, { ...publicUser, ...credentials })
  assert.deepEqual(foundCredentials ? { ...foundCredentials } : foundCredentials, credentials)

  const listed = await repository.listUsers()
  const listedUser = listed.find((item) => item.id === id)
  assert.deepEqual(listedUser ? { ...listedUser } : listedUser, publicUser)
  assert.equal('passwordHash' in (listedUser ?? {}), false)
  assert.equal('passwordSalt' in (listedUser ?? {}), false)
  assert.ok((await repository.listSupportAgents()).some((item) => item.id === id && item.role === 'support_agent'))

  await repository.insertSession({ userId: id, tokenHash: `${prefix}-first-token`, expiresAt, createdAt: now })
  const foundByToken = await repository.findUserByToken(`${prefix}-first-token`)
  assert.deepEqual(foundByToken ? { ...foundByToken } : foundByToken, { ...publicUser, expiresAt })
  await repository.revokeSession(`${prefix}-first-token`, now)
  assert.equal(await repository.findUserByToken(`${prefix}-first-token`), undefined)

  await repository.insertSession({ userId: id, tokenHash: `${prefix}-second-token`, expiresAt, createdAt: now })
  const updatedCredentials = { passwordHash: `${prefix}-new-hash`, passwordSalt: `${prefix}-new-salt` }
  await repository.updateCredentials(id, updatedCredentials, expiresAt)
  const refreshedCredentials = await repository.findCredentialsByUserId(id)
  assert.deepEqual(refreshedCredentials ? { ...refreshedCredentials } : refreshedCredentials, updatedCredentials)
  await repository.revokeUserSessions(id, expiresAt)
  assert.equal(await repository.findUserByToken(`${prefix}-second-token`), undefined)

  const customerEmail = `${prefix}-customer@example.com`
  const customerId = await repository.insertUser({
    id: 0, email: customerEmail, displayName: `${prefix} Customer`, role: 'customer',
    passwordHash: `${prefix}-customer-hash`, passwordSalt: `${prefix}-customer-salt`, createdAt: now, updatedAt: now,
  })
  assert.ok((await repository.listUsers()).some((item) => item.id === customerId && item.role === 'customer'))
  assert.equal((await repository.listSupportAgents()).some((item) => item.id === customerId), false)
}

export type AnalyticsContractDates = { old: string; since: string; recent: string }

export async function runAnalyticsRepositoryContract(
  repository: AnalyticsContractRepository,
  seed: (dates: AnalyticsContractDates) => void | Promise<void>,
) {
  const dates = {
    old: '2026-01-01T00:00:00.000Z',
    since: '2026-01-08T00:00:00.000Z',
    recent: '2026-01-09T00:00:00.000Z',
  }
  const empty = await repository.getAnalyticsMetrics(dates.since, 0.7)
  for (const count of [empty.conversationCount, empty.accepted, empty.corrected, empty.rejected,
    empty.escalationCount, empty.responseMessageCount, empty.groundedResponseCount,
    empty.highConfidenceCount, empty.lowConfidenceCount]) assert.equal(count.count, 0)
  assert.deepEqual({ ...empty.feedbackStats }, { count: 0, averageRating: 0, averageQuality: 0 })
  assert.equal(empty.latencyStats.averageLatencyMs, 0)
  assert.equal(empty.confidenceStats.averageConfidence, 0)
  for (const series of [empty.topicRows, empty.retrievalRows, empty.providerRows, empty.qualityTrend]) assert.deepEqual(series, [])

  await seed(dates)
  const metrics = await repository.getAnalyticsMetrics(dates.since, 0.7)
  assert.equal(metrics.conversationCount.count, 2)
  assert.deepEqual({ ...metrics.feedbackStats }, { count: 3, averageRating: 4, averageQuality: 80 })
  assert.equal(metrics.accepted.count, 1)
  assert.equal(metrics.corrected.count, 1)
  assert.equal(metrics.rejected.count, 0)
  assert.deepEqual(metrics.topicRows.map((row) => ({ ...row })), [{ topic: 'Refunds', conversations: 2 }])
  assert.deepEqual(metrics.retrievalRows.map((row) => ({ ...row })), [{ method: 'none', count: 3 }, { method: 'hybrid', count: 1 }])
  assert.deepEqual(metrics.providerRows.map((row) => ({ ...row })), [{ provider: 'unknown', count: 2 }, { provider: 'mastra-gemini', count: 1 }])
  assert.equal(metrics.responseMessageCount.count, 3)
  assert.equal(metrics.escalationCount.count, 1)
  assert.equal(metrics.latencyStats.averageLatencyMs, 200)
  assert.equal(metrics.confidenceStats.averageConfidence, 0.6)
  assert.equal(metrics.groundedResponseCount.count, 1)
  assert.equal(metrics.highConfidenceCount.count, 1)
  assert.equal(metrics.lowConfidenceCount.count, 1)
  assert.deepEqual(metrics.qualityTrend.map((row) => ({ ...row })), [
    { day: '2026-01-08', quality: 90, rating: 4 }, { day: '2026-01-09', quality: 60, rating: 0 },
  ])

  const all = await repository.getAnalyticsMetrics(undefined, 0.7)
  assert.equal(all.conversationCount.count, 3)
  assert.equal(all.feedbackStats.count, 4)
  assert.equal(all.rejected.count, 1)
  assert.equal(all.escalationCount.count, 2)
  assert.equal((await repository.getAnalyticsMetrics(dates.since, 0.8)).highConfidenceCount.count, 0)
}

export async function runFeedbackRepositoryContract(
  repository: FeedbackContractRepository,
  readFeedback: (id: string) => Promise<FeedbackRecord | undefined>,
  conversationId: number,
  messageId: string,
  prefix: string,
) {
  const createdAt = '2026-01-01T00:00:00.000Z'
  const entries: FeedbackRecord[] = [
    {
      id: `${prefix}:rating`, messageId, conversationId, rating: 0,
      feedbackType: 'customer_rating', comment: '', qualityScore: 0, createdAt,
    },
    {
      id: `${prefix}:accepted`, messageId, conversationId,
      feedbackType: 'accepted', qualityScore: 1, createdAt,
    },
    {
      id: `${prefix}:edited`, messageId, conversationId,
      feedbackType: 'edited', editedResponse: 'Revised response', qualityScore: 0.75, createdAt,
    },
    {
      id: `${prefix}:rejected`, messageId, conversationId,
      feedbackType: 'rejected', comment: 'Needs review', qualityScore: 0.25, createdAt,
    },
  ]

  for (const entry of entries) {
    await repository.insertFeedback(entry)
    assert.deepEqual(await readFeedback(entry.id), {
      ...entry,
      rating: entry.rating ?? null,
      comment: entry.comment ?? null,
      editedResponse: entry.editedResponse ?? null,
    })
  }
}

export async function runNotificationRepositoryContract(repository: NotificationContractRepository, prefix: string) {
  await repository.markAllNotificationsRead()
  const first = await repository.createNotification({ kind: `${prefix}:info`, title: `${prefix}:first`, message: 'First contract notification' })
  const second = await repository.createNotification({ kind: `${prefix}:warning`, title: `${prefix}:second`, message: 'Second contract notification' })

  assert.equal(first.readAt, null)
  assert.ok(Number.isFinite(Date.parse(first.createdAt)))
  assert.equal(second.readAt, null)
  assert.ok(Number.isFinite(Date.parse(second.createdAt)))

  const listed = await repository.listNotifications(100)
  assert.ok(listed.some((item) => item.id === first.id && item.title === first.title && item.message === first.message))
  assert.ok(listed.some((item) => item.id === second.id && item.title === second.title && item.message === second.message))

  assert.equal(await repository.markNotificationRead(first.id), true)
  const firstReadAt = (await repository.listNotifications(100)).find((item) => item.id === first.id)?.readAt
  assert.ok(firstReadAt)
  assert.equal(await repository.markNotificationRead(-1), false)
  assert.equal(Number(await repository.markAllNotificationsRead()), 1)
  const updated = await repository.listNotifications(100)
  assert.equal(updated.find((item) => item.id === first.id)?.readAt, firstReadAt)
  assert.ok(updated.find((item) => item.id === second.id)?.readAt)
  assert.equal(Number(await repository.markAllNotificationsRead()), 0)
}

export async function runConversationRepositoryContract(repository: ConversationContractRepository, prefix: string) {
  const now = '2026-01-01T00:00:00.000Z'
  const customerName = `${prefix} Customer`
  const base = {
    customerName,
    subject: 'Refund request',
    status: 'open' as const,
    priority: 'high' as const,
    topic: 'Refunds',
    assignedTo: 'Agent',
    tags: ['refund'],
    escalated: true,
    createdAt: now,
    updatedAt: now,
  }

  const first = await repository.createConversation(base)
  const second = await repository.createConversation({
    ...base,
    subject: 'Previous support',
    assignedTo: null,
    escalated: false,
    updatedAt: '2026-01-02T00:00:00.000Z',
  })
  const third = await repository.createConversation({
    ...base,
    customerName: `${prefix} Visitor`,
    subject: 'Other question',
    tags: [],
    assignedTo: null,
    status: 'resolved',
    escalated: false,
    updatedAt: '2026-01-03T00:00:00.000Z',
  })

  assert.deepEqual(await repository.getConversation(first.id), { ...base, id: first.id })
  assert.equal((await repository.listConversations()).filter((item) => item.customerName.startsWith(prefix)).length, 3)

  const page = await repository.listConversationPage(2, 0, prefix.toUpperCase())
  assert.equal(page.total, 3)
  assert.deepEqual(page.items.map((item) => item.id), [third.id, second.id])
  assert.deepEqual((await repository.listConversationPage(2, 2, prefix)).items.map((item) => item.id), [first.id])
  assert.equal((await repository.listConversationPage(2, 0, `${prefix}-missing`)).total, 0)

  const preserved = await repository.updateConversation(first.id, { status: 'pending', assignedTo: undefined, tags: undefined, escalated: undefined })
  assert.equal(preserved?.status, 'pending')
  assert.equal(preserved?.assignedTo, 'Agent')
  assert.deepEqual(preserved?.tags, ['refund'])
  assert.equal(preserved?.escalated, true)
  assert.equal(preserved?.priority, 'high')

  const cleared = await repository.updateConversation(first.id, { assignedTo: null, tags: [], escalated: false })
  assert.equal(cleared?.assignedTo, null)
  assert.deepEqual(cleared?.tags, [])
  assert.equal(cleared?.escalated, false)
  assert.equal(await repository.updateConversation(-1, { status: 'pending' }), undefined)

  const answer = {
    id: `${prefix}:assistant`,
    conversationId: first.id,
    role: 'assistant',
    content: 'Verified answer',
    confidence: 0.85,
    sources: ['Refund policy'],
    sourceScores: [{ title: 'Refund policy', score: 0.85 }],
    retrievalMethod: 'hybrid',
    generationProvider: 'local-knowledge',
    latencyMs: 12,
    shouldEscalate: false,
    createdAt: now,
  }
  await repository.appendMessage(answer)
  await repository.appendMessage({ ...answer, id: `${prefix}:customer`, role: 'customer', content: 'Follow-up', createdAt: '2026-01-03T00:00:00.000Z' })
  await repository.appendMessage({ ...answer, id: `${prefix}:previous`, conversationId: second.id, role: 'customer', content: 'Previous interaction' })

  assert.deepEqual(await repository.listMessages(first.id), [answer, { ...answer, id: `${prefix}:customer`, role: 'customer', content: 'Follow-up', createdAt: '2026-01-03T00:00:00.000Z' }])
  assert.equal(await repository.getLatestAssistantMessageId(first.id), answer.id)
  assert.equal(await repository.getLatestAssistantMessageId(second.id), undefined)
  assert.deepEqual(await repository.listMessages(third.id), [])

  const context = await repository.getCustomerContext(first.id)
  assert.ok(context)
  assert.equal(context.customer, customerName)
  assert.equal(context.totalConversations, 2)
  assert.equal(context.openConversations, 2)
  assert.deepEqual(context.topics.map((item) => ({ topic: item.topic, count: item.count })), [{ topic: 'Refunds', count: 2 }])
  assert.equal(context.history.length, 1)
  assert.equal(context.history[0].id, second.id)
  assert.equal(context.history[0].lastMessage, 'Previous interaction')
  assert.equal(await repository.getCustomerContext(-1), undefined)
}

export async function runGraphRepositoryContract(repository: GraphContractRepository, prefix: string) {
  const issueId = `${prefix}:issue`
  const procedureId = `${prefix}:procedure`
  const knowledgeId = `${prefix}:knowledge`
  const nodeIds = new Set([issueId, procedureId, knowledgeId])

  try {
    const first = await repository.upsertGraphNode({
      id: issueId,
      type: 'SupportIssue',
      properties: { title: 'Contract refund delay', active: false, count: 0, optional: null },
    })
    assert.equal(first?.properties.title, 'Contract refund delay')
    const createdAt = first?.createdAt

    const updated = await repository.upsertGraphNode({
      id: issueId,
      type: 'SupportAgent',
      properties: { title: 'Contract refund delay', status: 'reviewed' },
    })
    assert.equal(updated?.type, 'SupportAgent')
    assert.equal(updated?.createdAt, createdAt)
    assert.equal((await repository.getGraphNode(issueId))?.properties.status, 'reviewed')

    await repository.upsertGraphNode({ id: procedureId, type: 'SupportProcedure' })
    await repository.upsertGraphNode({ id: knowledgeId, type: 'KnowledgeDocument', properties: { title: 'Contract refund policy' } })
    await repository.createGraphRelationship({ sourceId: issueId, type: 'RESOLVED_BY', targetId: procedureId })
    await repository.createGraphRelationship({ sourceId: procedureId, type: 'SUPPORTED_BY', targetId: knowledgeId })
    await repository.createGraphRelationship({ sourceId: knowledgeId, type: 'ABOUT', targetId: issueId })

    const relationships = (await repository.listGraphRelationships()).filter((item) => nodeIds.has(item.sourceId) || nodeIds.has(item.targetId))
    assert.equal(relationships.length, 3)
    assert.ok((await repository.queryGraphPaths(issueId, 2)).some((path) => path.nodes.join(',') === `${issueId},${procedureId},${knowledgeId}`))
    assert.ok((await repository.findGraphKnowledgeTitles('contract refund')).includes('Contract refund policy'))
    assert.deepEqual(await repository.queryGraphPaths(`${prefix}:missing`), [])
    assert.equal(await repository.deleteGraphNode(knowledgeId), true)
    assert.equal((await repository.listGraphRelationships()).filter((item) => nodeIds.has(item.sourceId) || nodeIds.has(item.targetId)).length, 1)
  } finally {
    await repository.deleteGraphNode(issueId)
    await repository.deleteGraphNode(procedureId)
    await repository.deleteGraphNode(knowledgeId)
  }
}

export async function runKnowledgeRepositoryContract(repository: KnowledgeContractRepository, prefix: string) {
  const title = `${prefix} policy`
  let documentId: number | undefined

  try {
    const document = await repository.createKnowledgeDocument({
      title,
      category: 'Policy',
      content: 'Contract guidance',
      sourceFilename: `${prefix}.txt`,
    })
    documentId = document.id
    assert.equal(document.status, 'indexed')
    assert.equal(document.archivedAt, null)
    assert.equal((await repository.getKnowledgeDocumentVersions(document.id))[0]?.version, 1)

    await repository.upsertKnowledgeEmbedding({
      knowledgeDocumentId: document.id,
      model: 'contract-model',
      vector: [1, 0],
      contentHash: 'contract-hash',
    })
    assert.equal((await repository.listEmbeddedKnowledge()).find((item) => item.id === document.id)?.model, 'contract-model')

    const updated = await repository.updateKnowledgeDocument(document.id, {
      title,
      category: 'Policy',
      content: 'Revised contract guidance',
      status: 'indexed',
      sourceFilename: `${prefix}.txt`,
    })
    assert.equal(updated?.content, 'Revised contract guidance')
    assert.deepEqual((await repository.getKnowledgeDocumentVersions(document.id)).map((item) => item.version), [2, 1])
    assert.equal((await repository.listEmbeddedKnowledge()).some((item) => item.id === document.id), false)

    assert.equal(Number((await repository.archiveKnowledgeDocuments([document.id, document.id])).archived), 1)
    assert.equal((await repository.listKnowledge()).some((item) => item.id === document.id), false)
    assert.ok((await repository.listArchivedKnowledge()).some((item) => item.id === document.id))
    assert.equal(Number((await repository.restoreKnowledgeDocuments([document.id])).restored), 1)
    assert.equal((await repository.listKnowledge()).some((item) => item.id === document.id), true)
    assert.equal(Number((await repository.deleteKnowledgeDocuments([document.id, document.id])).deleted), 1)
    assert.equal((await repository.getKnowledgeDocumentVersions(document.id)).length, 0)
    documentId = undefined
  } finally {
    if (documentId !== undefined) await repository.deleteKnowledgeDocuments([documentId])
  }
}
