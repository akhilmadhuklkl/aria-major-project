import './env.js'
import cors from 'cors'
import express from 'express'
import { MastraServer } from '@mastra/express'
import { createAgentService, getAgentProvider } from './agent-service.js'
import {
  calculateQualityScore,
  createKnowledgeDocument,
  db,
  getKnowledgeSourceFeedbackStats,
  inferTopic,
  listKnowledge,
  searchKnowledge,
} from './database.js'
import { getKnowledgeEmbeddingStats } from './database.js'
import { calculateFeedbackAdjustment, neutralQualityScore } from './feedback-adaptation.js'
import { HybridKnowledgeRetriever } from './hybrid-retrieval.js'
import { mastra } from '../src/mastra/index.js'

const app = express()
const port = Number(process.env.PORT ?? 8787)
const hybridRetriever = new HybridKnowledgeRetriever(searchKnowledge)
const agent = createAgentService(hybridRetriever.retrieve)
const mastraModel = process.env.MASTRA_MODEL ?? 'google/gemini-2.5-flash'
const mastraServerEnabled = process.env.ENABLE_MASTRA_SERVER === 'true'
const llmProvider = mastraModel.startsWith('google/')
  ? 'google-gemini'
  : mastraModel.startsWith('openai/')
    ? 'openai'
    : 'configured-model'

app.use(cors())
app.use(express.json())

if (mastraServerEnabled) {
  const mastraServer = new MastraServer({ app, mastra })
  await mastraServer.init()
}

app.get('/api/health', (_request, response) => {
  const embeddingStats = getKnowledgeEmbeddingStats()
  const llmProviderConfigured = llmProvider === 'google-gemini'
    ? Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim())
    : llmProvider === 'openai'
      ? Boolean(process.env.OPENAI_API_KEY?.trim())
      : Boolean(
        process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim()
        || process.env.GOOGLE_API_KEY?.trim()
        || process.env.OPENAI_API_KEY?.trim(),
      )

  response.json({
    service: 'ARIA API',
    status: 'operational',
    agentProvider: getAgentProvider(),
    database: 'sqlite',
    mastraReady: true,
    mastraServerEnabled,
    mastraModel,
    llmProvider,
    llmProviderConfigured,
    retrieval: {
      primary: 'semantic',
      fallback: 'keyword',
      embeddingModel: 'Xenova/all-MiniLM-L6-v2',
      storedEmbeddings: embeddingStats.count,
      dimensions: embeddingStats.maximumDimensions,
    },
  })
})

app.get('/api/interim-status', (_request, response) => {
  response.json({
    milestone: 'Interim report and demo',
    readyForDemo: true,
    completed: [
      'React frontend with agent, customer, knowledge, and analytics views',
      'Express API connected to the frontend',
      'SQLite persistence for conversations, messages, feedback, and knowledge',
      'Knowledge-grounded response generation with confidence and source tracking',
      'Semantic vector retrieval with automatic keyword fallback',
      'Feedback capture from customer ratings and agent actions',
      'Analytics calculated from persisted database records',
      'Mastra-compatible remote agent endpoint configured through MASTRA_AGENT_URL',
      'Local Mastra server can be enabled with ENABLE_MASTRA_SERVER=true',
    ],
    pendingForFinal: [
      'Live provider API key and full Mastra Studio setup',
      'Long-term conversation memory',
      'Authentication, deployment, and extended testing',
    ],
  })
})

app.post('/api/chat', async (request, response) => {
  const query = String(request.body?.message ?? '').trim()
  const requestedConversationId = Number(request.body?.conversationId)

  if (!query) {
    response.status(400).json({ error: 'message is required' })
    return
  }

  const now = new Date().toISOString()
  let conversationId = Number.isInteger(requestedConversationId) ? requestedConversationId : 0

  if (!conversationId) {
    const subject = query.length > 48 ? `${query.slice(0, 45)}...` : query
    const created = db.prepare(`
      INSERT INTO conversations (customer_name, subject, status, priority, topic, created_at, updated_at)
      VALUES (?, ?, 'open', 'normal', ?, ?, ?)
    `).run('Demo Customer', subject, inferTopic(query), now, now)
    conversationId = Number(created.lastInsertRowid)
  }

  const customerMessageId = crypto.randomUUID()
  db.prepare(`
    INSERT INTO messages (id, conversation_id, role, content, created_at)
    VALUES (?, ?, 'customer', ?, ?)
  `).run(customerMessageId, conversationId, query, now)

  const result = await agent.generateResponse(query)
  const assistantMessageId = crypto.randomUUID()
  const assistantCreatedAt = new Date().toISOString()

  db.prepare(`
    INSERT INTO messages (
      id, conversation_id, role, content, confidence, sources, source_scores,
      retrieval_method, generation_provider, should_escalate, created_at
    )
    VALUES (?, ?, 'assistant', ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    assistantMessageId,
    conversationId,
    result.answer,
    result.confidence,
    JSON.stringify(result.sources),
    JSON.stringify(result.sourceScores),
    result.retrievalMethod,
    result.generationProvider,
    result.shouldEscalate ? 1 : 0,
    assistantCreatedAt,
  )
  db.prepare('UPDATE conversations SET topic = ?, updated_at = ? WHERE id = ?')
    .run(inferTopic(query), assistantCreatedAt, conversationId)
  for (const source of result.sources) {
    db.prepare('UPDATE knowledge_documents SET uses = uses + 1 WHERE title = ?').run(source)
  }

  response.json({
    id: assistantMessageId,
    conversationId,
    role: 'assistant',
    createdAt: assistantCreatedAt,
    ...result,
  })
})

app.get('/api/conversations', (_request, response) => {
  const rows = db.prepare(`
    SELECT id, customer_name AS customer, subject, status, priority, topic, created_at AS createdAt, updated_at AS updatedAt
    FROM conversations ORDER BY updated_at DESC
  `).all()
  response.json(rows)
})

app.get('/api/conversations/:id/messages', (request, response) => {
  const rows = db.prepare(`
    SELECT
      id,
      conversation_id AS conversationId,
      role,
      content,
      confidence,
      sources,
      source_scores AS sourceScores,
      retrieval_method AS retrievalMethod,
      generation_provider AS generationProvider,
      should_escalate AS shouldEscalate,
      created_at AS createdAt
    FROM messages WHERE conversation_id = ? ORDER BY created_at ASC
  `).all(Number(request.params.id)).map((row) => {
    const message = row as Record<string, unknown>
    return {
      ...message,
      sources: message.sources ? JSON.parse(String(message.sources)) : [],
      sourceScores: message.sourceScores ? JSON.parse(String(message.sourceScores)) : [],
      shouldEscalate: Boolean(message.shouldEscalate),
    }
  })
  response.json(rows)
})

app.post('/api/feedback', (request, response) => {
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

  db.prepare(`
    INSERT INTO feedback (id, message_id, conversation_id, rating, feedback_type, comment, edited_response, quality_score, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    entry.id, entry.messageId, entry.conversationId, entry.rating ?? null, entry.feedbackType,
    entry.comment, entry.editedResponse, entry.qualityScore, entry.createdAt,
  )
  response.status(201).json(entry)
})

app.post('/api/agent-actions', (request, response) => {
  const conversationId = Number(request.body?.conversationId)
  const action = String(request.body?.action ?? '')
  const editedResponse = request.body?.editedResponse ? String(request.body.editedResponse) : null

  if (!conversationId || !['accepted', 'edited', 'rejected'].includes(action)) {
    response.status(400).json({ error: 'valid conversationId and action are required' })
    return
  }

  let message = db.prepare(`
    SELECT id FROM messages WHERE conversation_id = ? AND role = 'assistant' ORDER BY created_at DESC LIMIT 1
  `).get(conversationId) as { id: string } | undefined

  if (!message) {
    const id = crypto.randomUUID()
    db.prepare(`
      INSERT INTO messages (id, conversation_id, role, content, confidence, sources, created_at)
      VALUES (?, ?, 'assistant', ?, 0.92, '[]', ?)
    `).run(id, conversationId, editedResponse ?? 'ARIA agent-assist suggestion', new Date().toISOString())
    message = { id }
  }

  const entry = {
    id: crypto.randomUUID(),
    messageId: message.id,
    conversationId,
    feedbackType: action,
    editedResponse,
    qualityScore: calculateQualityScore(undefined, action),
    createdAt: new Date().toISOString(),
  }
  db.prepare(`
    INSERT INTO feedback (id, message_id, conversation_id, feedback_type, edited_response, quality_score, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(entry.id, entry.messageId, entry.conversationId, entry.feedbackType, entry.editedResponse, entry.qualityScore, entry.createdAt)

  response.status(201).json(entry)
})

app.get('/api/knowledge', (_request, response) => {
  response.json(listKnowledge())
})

app.post('/api/knowledge', (request, response) => {
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
    response.status(201).json(createKnowledgeDocument({ title, category, content, status }))
  } catch {
    response.status(409).json({ error: 'a knowledge document with this title already exists' })
  }
})

app.get('/api/analytics/summary', (_request, response) => {
  const conversationCount = db.prepare('SELECT COUNT(*) AS count FROM conversations').get() as { count: number }
  const feedbackStats = db.prepare(`
    SELECT COUNT(*) AS count, COALESCE(AVG(rating), 0) AS averageRating, COALESCE(AVG(quality_score), 0) AS averageQuality
    FROM feedback
  `).get() as { count: number; averageRating: number; averageQuality: number }
  const accepted = db.prepare("SELECT COUNT(*) AS count FROM feedback WHERE feedback_type = 'accepted'").get() as { count: number }
  const corrected = db.prepare("SELECT COUNT(*) AS count FROM feedback WHERE feedback_type = 'edited'").get() as { count: number }
  const topicRows = db.prepare(`
    SELECT topic, COUNT(*) AS conversations FROM conversations GROUP BY topic ORDER BY conversations DESC
  `).all()
  const sourceStats = getKnowledgeSourceFeedbackStats()
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
  const agentActionCount = accepted.count + corrected.count + (
    db.prepare("SELECT COUNT(*) AS count FROM feedback WHERE feedback_type = 'rejected'").get() as { count: number }
  ).count

  response.json({
    conversations: conversationCount.count,
    averageRating: Number(feedbackStats.averageRating.toFixed(1)),
    averageQuality: Math.round(feedbackStats.averageQuality),
    acceptanceRate: feedbackStats.count ? Math.round((accepted.count / feedbackStats.count) * 100) : 0,
    correctionRate: feedbackStats.count ? Math.round((corrected.count / feedbackStats.count) * 100) : 0,
    feedbackRecords: feedbackStats.count,
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

app.listen(port, () => {
  console.log(`ARIA API listening on http://127.0.0.1:${port}`)
})
