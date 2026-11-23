type CheckResult = {
  name: string
  passed: boolean
  detail: string
}

const apiBaseUrl = process.env.VALIDATION_API_URL?.trim() ?? 'http://localhost:8787/api'
const bearerToken = process.env.SMOKE_API_TOKEN?.trim()
const results: CheckResult[] = []

try {
  const healthResult = await requestWithMetadata<Record<string, unknown>>('/health')
  const health = healthResult.body
  addResult(
    'Health endpoint',
    health.status === 'operational',
    `status=${String(health.status)}, database=${String(health.database)}`,
  )
  addResult(
    'Request correlation ID',
    Boolean(healthResult.requestId),
    healthResult.requestId ? `requestId=${healthResult.requestId}` : 'X-Request-ID header missing',
  )

  const readiness = await request<Record<string, unknown>>('/ready')
  addResult(
    'Readiness endpoint',
    readiness.ready === true,
    `ready=${String(readiness.ready)}, database=${String(readiness.database)}`,
  )

  const knowledge = await request<Array<{ title: string; status: string }>>('/knowledge')
  addResult(
    'Knowledge endpoint',
    knowledge.length > 0 && knowledge.every((item) => Boolean(item.title) && Boolean(item.status)),
    `${knowledge.length} records returned`,
  )

  const archivedKnowledge = await request<unknown[]>('/knowledge/archived')
  addResult(
    'Archived knowledge endpoint',
    Array.isArray(archivedKnowledge),
    `${archivedKnowledge.length} archived records returned`,
  )

  const status = await request<Record<string, unknown>>('/system-status')
  const backend = status.backend as Record<string, unknown> | undefined
  const ai = status.ai as Record<string, unknown> | undefined
  addResult(
    'System status endpoint',
    backend?.status === 'operational',
    'system status returned successfully',
  )
  addResult(
    'AI provider status',
    typeof ai?.agentProvider === 'string' && ai.agentProvider.length > 0,
    `provider=${String(ai?.agentProvider ?? 'unknown')}`,
  )

  const analytics = await request<Record<string, unknown>>('/analytics/summary')
  addResult(
    'Analytics endpoint',
    typeof analytics.conversations === 'number'
      && typeof analytics.feedbackRecords === 'number'
      && typeof analytics.averageLatencyMs === 'number'
      && typeof analytics.averageConfidence === 'number'
      && typeof analytics.escalationRate === 'number'
      && Array.isArray(analytics.providers)
      && Array.isArray(analytics.qualityTrend),
    `conversations=${String(analytics.conversations)}, feedback=${String(analytics.feedbackRecords)}`,
  )

  const conversations = await request<{ items: unknown[]; total: number; queueCounts: { mine: number; unassigned: number; attention: number } }>('/conversations/page?limit=1&offset=0')
  addResult(
    'Conversation queue counts',
    Array.isArray(conversations.items)
      && typeof conversations.total === 'number'
      && typeof conversations.queueCounts?.mine === 'number'
      && typeof conversations.queueCounts?.unassigned === 'number'
      && typeof conversations.queueCounts?.attention === 'number',
    `total=${conversations.total}, mine=${conversations.queueCounts?.mine}, unassigned=${conversations.queueCounts?.unassigned}`,
  )

  const conversationSearch = await request<{ items: unknown[]; total: number; search: string }>('/conversations/page?limit=1&offset=0&q=refund')
  addResult(
    'Conversation search',
    conversationSearch.search === 'refund' && conversationSearch.total > 0 && conversationSearch.items.length > 0,
    `query=${conversationSearch.search}, matches=${conversationSearch.total}`,
  )

  const graph = await request<{ nodes: unknown[]; relationships: unknown[] }>('/knowledge-graph')
  addResult(
    'Knowledge Graph endpoint',
    Array.isArray(graph.nodes) && Array.isArray(graph.relationships),
    `nodes=${graph.nodes.length}, relationships=${graph.relationships.length}`,
  )
} catch (error) {
  addResult('API smoke runner', false, error instanceof Error ? error.message : 'Unknown error')
}

const passed = results.filter((result) => result.passed).length
const failed = results.length - passed

console.log('\nARIA Read-only API Smoke Check')
console.log(`API: ${apiBaseUrl}`)
console.log('----------------------------------------')
for (const result of results) {
  console.log(`${result.passed ? 'PASS' : 'FAIL'} ${result.name} - ${result.detail}`)
}
console.log('----------------------------------------')
console.log(`${passed}/${results.length} checks passed`)

if (failed > 0) process.exit(1)

async function request<T>(path: string): Promise<T> {
  return (await requestWithMetadata<T>(path)).body
}

async function requestWithMetadata<T>(path: string): Promise<{ body: T; requestId: string | null }> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: bearerToken ? { Authorization: `Bearer ${bearerToken}` } : undefined,
  })
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`${path} returned ${response.status}${text ? `: ${text}` : ''}`)
  }
  return { body: await response.json() as T, requestId: response.headers.get('X-Request-ID') }
}

function addResult(name: string, passed: boolean, detail: string) {
  results.push({ name, passed, detail })
}
