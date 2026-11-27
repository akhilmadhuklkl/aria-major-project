export type DeploymentCheck = {
  name: string
  passed: boolean
  detail: string
}

type DeploymentResponse = {
  status: number
  body: Record<string, unknown>
  requestId: string | null
}

type DeploymentVerificationOptions = {
  expectedDatabase?: string
  token?: string
  fetchImpl?: typeof fetch
}

export async function verifyDeployment(apiBaseUrl: string, options: DeploymentVerificationOptions = {}): Promise<DeploymentCheck[]> {
  const checks: DeploymentCheck[] = []
  const expectedDatabase = options.expectedDatabase?.trim().toLowerCase() || 'postgres'
  const fetchImpl = options.fetchImpl ?? fetch
  const baseUrl = normalizeApiBaseUrl(apiBaseUrl)

  if (!baseUrl) {
    return [{ name: 'Deployment API URL', passed: false, detail: 'Use an http(s) URL ending with /api' }]
  }

  addCheck(checks, 'Deployment API URL', true, baseUrl)
  if (!options.token?.trim()) {
    addCheck(checks, 'Smoke token provided', false, 'Set SMOKE_API_TOKEN for protected production endpoints')
  } else {
    addCheck(checks, 'Smoke token provided', true, 'Bearer token supplied without printing its value')
  }

  const responses = await Promise.all([
    requestEndpoint(baseUrl, '/ready', options.token, fetchImpl),
    requestEndpoint(baseUrl, '/health', options.token, fetchImpl),
    requestEndpoint(baseUrl, '/interim-status', options.token, fetchImpl),
  ])
  const [readiness, health, implementation] = responses

  addCheck(
    checks,
    'Readiness endpoint',
    readiness.status === 200 && readiness.body.ready === true && readiness.body.database === expectedDatabase,
    `status=${readiness.status}, ready=${String(readiness.body.ready)}, database=${String(readiness.body.database)}`,
  )
  addCheck(
    checks,
    'Health endpoint',
    health.status === 200
      && health.body.status === 'operational'
      && health.body.database === expectedDatabase
      && health.body.authRequired === true
      && typeof health.body.agentProvider === 'string',
    `status=${health.status}, database=${String(health.body.database)}, authRequired=${String(health.body.authRequired)}, provider=${String(health.body.agentProvider)}`,
  )
  addCheck(
    checks,
    'Implementation status',
    implementation.status === 200 && implementation.body.readyForDemo === true,
    `status=${implementation.status}, readyForDemo=${String(implementation.body.readyForDemo)}`,
  )
  addCheck(
    checks,
    'Request correlation headers',
    responses.every((response) => Boolean(response.requestId)),
    responses.every((response) => Boolean(response.requestId)) ? 'X-Request-ID present on readiness, health, and status responses' : 'One or more responses are missing X-Request-ID',
  )

  return checks
}

function normalizeApiBaseUrl(value: string): string | undefined {
  try {
    const url = new URL(value.trim().replace(/\/$/, ''))
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined
    if (!url.pathname.endsWith('/api')) return undefined
    return url.toString().replace(/\/$/, '')
  } catch {
    return undefined
  }
}

async function requestEndpoint(baseUrl: string, path: string, token: string | undefined, fetchImpl: typeof fetch): Promise<DeploymentResponse> {
  try {
    const response = await fetchImpl(`${baseUrl}${path}`, {
      headers: token?.trim() ? { Authorization: `Bearer ${token.trim()}` } : undefined,
    })
    const body = await response.json().catch(() => ({})) as Record<string, unknown>
    return { status: response.status, body, requestId: response.headers.get('X-Request-ID') }
  } catch (error) {
    return { status: 0, body: { error: error instanceof Error ? error.message : 'request failed' }, requestId: null }
  }
}

function addCheck(checks: DeploymentCheck[], name: string, passed: boolean, detail: string) {
  checks.push({ name, passed, detail })
}
