type ValidationResult = {
  check: string
  passed: boolean
  detail: string
}

type ChatResponse = {
  id: string
  conversationId: number
  answer: string
  confidence: number
  sources: string[]
  sourceScores: Array<{
    title: string
    score: number
    semanticScore?: number
    feedbackAdjustment?: number
  }>
  retrievalMethod: 'semantic' | 'keyword' | 'none'
  generationProvider: 'mastra-gemini' | 'local-knowledge'
  shouldEscalate: boolean
}

type AnalyticsSummary = {
  conversations: number
  feedbackRecords: number
  learningSignals?: {
    learnedSourceCount: number
    trackedSourceCount: number
    agentActionCount: number
    averageSourceQuality: number
  }
}

const apiBaseUrl = process.env.VALIDATION_API_URL?.trim() ?? 'http://localhost:8787/api'
const results: ValidationResult[] = []

try {
  const health = await request<Record<string, unknown>>('/health')
  addResult(
    'Backend health',
    health.status === 'operational' && health.database === 'sqlite',
    `status=${String(health.status)}, database=${String(health.database)}`,
  )

  const retrieval = health.retrieval as Record<string, unknown> | undefined
  addResult(
    'Semantic retrieval metadata',
    retrieval?.primary === 'semantic' && Number(retrieval.storedEmbeddings ?? 0) > 0,
    `primary=${String(retrieval?.primary)}, storedEmbeddings=${String(retrieval?.storedEmbeddings)}`,
  )

  const knowledge = await request<Array<{ title: string; status: string }>>('/knowledge')
  addResult(
    'Knowledge records',
    knowledge.length >= 8 && knowledge.some((item) => item.title === 'Refund and return policy'),
    `${knowledge.length} records available`,
  )

  const chat = await post<ChatResponse>('/chat', {
    message: 'The item arrived cracked. Which evidence do you need from me?',
  })
  addResult(
    'Grounded chat response',
    chat.sources.includes('Damaged product resolution') && chat.confidence >= 0.75,
    `source=${chat.sources[0] ?? 'none'}, confidence=${chat.confidence}`,
  )
  addResult(
    'Semantic source evidence',
    chat.retrievalMethod === 'semantic' && chat.sourceScores.some((item) => item.semanticScore !== undefined),
    `method=${chat.retrievalMethod}, scoreCount=${chat.sourceScores.length}`,
  )

  await post('/feedback', {
    messageId: chat.id,
    conversationId: chat.conversationId,
    rating: 5,
    feedbackType: 'customer_rating',
  })
  addResult(
    'Customer feedback storage',
    true,
    `stored 5-star feedback for conversation ${chat.conversationId}`,
  )

  await post('/agent-actions', {
    conversationId: chat.conversationId,
    action: 'accepted',
  })
  addResult(
    'Agent action storage',
    true,
    `stored accepted action for conversation ${chat.conversationId}`,
  )

  const safeChat = await post<ChatResponse>('/chat', {
    message: 'What is the weather forecast for tomorrow?',
  })
  addResult(
    'Unrelated-query escalation',
    safeChat.retrievalMethod === 'none' && safeChat.shouldEscalate,
    `retrieval=${safeChat.retrievalMethod}, sources=${safeChat.sources.length}, shouldEscalate=${safeChat.shouldEscalate}`,
  )

  const analytics = await request<AnalyticsSummary>('/analytics/summary')
  addResult(
    'Analytics learning summary',
    analytics.conversations > 0
      && analytics.feedbackRecords > 0
      && Number(analytics.learningSignals?.trackedSourceCount ?? 0) > 0,
    `conversations=${analytics.conversations}, feedback=${analytics.feedbackRecords}, trackedSources=${analytics.learningSignals?.trackedSourceCount ?? 0}`,
  )
} catch (error) {
  addResult(
    'Validation runner',
    false,
    error instanceof Error ? error.message : 'Unknown validation error',
  )
}

const passed = results.filter((result) => result.passed).length
const failed = results.length - passed

console.log('\nARIA Final Validation')
console.log(`API: ${apiBaseUrl}`)
console.log('----------------------------------------')
for (const result of results) {
  console.log(`${result.passed ? 'PASS' : 'FAIL'} ${result.check} - ${result.detail}`)
}
console.log('----------------------------------------')
console.log(`${passed}/${results.length} checks passed`)

if (failed > 0) process.exit(1)

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`)
  return parseResponse<T>(response, path)
}

async function post<T = unknown>(path: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return parseResponse<T>(response, path)
}

async function parseResponse<T>(response: Response, path: string): Promise<T> {
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`${path} returned ${response.status}${text ? `: ${text}` : ''}`)
  }

  return response.json() as Promise<T>
}

function addResult(check: string, passed: boolean, detail: string) {
  results.push({ check, passed, detail })
}
