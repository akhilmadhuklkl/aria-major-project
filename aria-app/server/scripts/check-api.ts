type CheckResult = {
  name: string
  passed: boolean
  detail: string
}

const apiBaseUrl = process.env.VALIDATION_API_URL?.trim() ?? 'http://localhost:8787/api'
const bearerToken = process.env.SMOKE_API_TOKEN?.trim()
const results: CheckResult[] = []

try {
  const health = await request<Record<string, unknown>>('/health')
  addResult(
    'Health endpoint',
    health.status === 'operational',
    `status=${String(health.status)}, database=${String(health.database)}`,
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

  const status = await request<Record<string, unknown>>('/system-status')
  const backend = status.backend as Record<string, unknown> | undefined
  addResult(
    'System status endpoint',
    backend?.status === 'operational',
    'system status returned successfully',
  )

  const analytics = await request<Record<string, unknown>>('/analytics/summary')
  addResult(
    'Analytics endpoint',
    typeof analytics.conversations === 'number' && typeof analytics.feedbackRecords === 'number',
    `conversations=${String(analytics.conversations)}, feedback=${String(analytics.feedbackRecords)}`,
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
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: bearerToken ? { Authorization: `Bearer ${bearerToken}` } : undefined,
  })
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`${path} returned ${response.status}${text ? `: ${text}` : ''}`)
  }
  return response.json() as Promise<T>
}

function addResult(name: string, passed: boolean, detail: string) {
  results.push({ name, passed, detail })
}
