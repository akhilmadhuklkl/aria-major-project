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
    readiness.ready === true && readiness.database === health.database && readiness.graphStore === health.graphStore,
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
  addResult(
    'Mastra runtime mode',
    ai?.mastraRuntime === 'remote' || ai?.mastraRuntime === 'embedded' || ai?.mastraRuntime === 'fallback',
    `runtime=${String(ai?.mastraRuntime ?? 'unknown')}`,
  )

  const implementationStatus = await request<{ readyForDemo: boolean; completed: string[]; pendingForFinal: string[] }>('/interim-status')
  addResult(
    'Implementation status endpoint',
    implementationStatus.readyForDemo === true
      && implementationStatus.completed.includes('Authentication, role-based access, and protected API routes')
      && implementationStatus.completed.includes('Containerized production build with CI and browser/API verification')
      && implementationStatus.completed.includes('Persisted customer conversation memory with recent history in Agent Workspace')
      && implementationStatus.completed.includes('Signed webhook integrations with delivery retries, testing, audit logs, and pause/resume controls')
      && implementationStatus.completed.includes('PostgreSQL runtime selection with migration, backup/restore, and CI smoke verification')
      && implementationStatus.completed.includes('Hosted PostgreSQL configuration preflight, verification, and rollback runbook')
      && implementationStatus.completed.includes('Embedded Mastra agent can serve the main chat flow with automatic local fallback')
      && implementationStatus.pendingForFinal.includes('Managed PostgreSQL deployment execution and monitored rollout')
      && !implementationStatus.pendingForFinal.includes('Long-term conversation memory')
      && !implementationStatus.pendingForFinal.some((item) => /authentication|adapter cutover|extended testing/i.test(item)),
    `completed=${implementationStatus.completed.length}, pending=${implementationStatus.pendingForFinal.length}`,
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
      && Array.isArray(analytics.qualityTrend)
      && typeof (analytics.qualityReport as Record<string, unknown> | undefined)?.groundedResponseRate === 'number',
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

  const firstConversation = conversations.items[0] as { id?: number } | undefined
  const customerContext = firstConversation?.id
    ? await request<{ customer: string; totalConversations: number; history: unknown[] }>(`/conversations/${firstConversation.id}/context`)
    : undefined
  addResult(
    'Customer context endpoint',
    Boolean(customerContext?.customer) && typeof customerContext?.totalConversations === 'number' && Array.isArray(customerContext?.history),
    customerContext ? `customer=${customerContext.customer}, conversations=${customerContext.totalConversations}` : 'no conversation available',
  )

  const supportAgents = await request<unknown[]>('/support-agents')
  addResult(
    'Support agent directory',
    Array.isArray(supportAgents),
    `${supportAgents.length} support agents returned`,
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

  const metrics = await request<{ requests: number; errors: number; averageLatencyMs: number; routes: unknown[] }>('/metrics')
  addResult(
    'Runtime metrics endpoint',
    typeof metrics.requests === 'number' && typeof metrics.errors === 'number' && typeof metrics.averageLatencyMs === 'number' && Array.isArray(metrics.routes),
    `requests=${metrics.requests}, errors=${metrics.errors}, averageLatency=${metrics.averageLatencyMs}ms`,
  )

  const deliveries = await request<unknown[]>('/integrations/webhooks/deliveries')
  addResult(
    'Webhook delivery history endpoint',
    Array.isArray(deliveries),
    `${deliveries.length} delivery records returned`,
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
