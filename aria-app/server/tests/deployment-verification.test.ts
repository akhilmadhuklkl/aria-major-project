import test from 'node:test'
import assert from 'node:assert/strict'
import { verifyDeployment } from '../deployment-verification.js'

function createFetch(responses: Record<string, { status: number; body: Record<string, unknown>; requestId?: string }>) {
  return async (input: string | URL | Request) => {
    const path = new URL(String(input)).pathname
    const response = responses[path]
    if (!response) return new Response('{}', { status: 404 })
    return new Response(JSON.stringify(response.body), {
      status: response.status,
      headers: response.requestId ? { 'X-Request-ID': response.requestId } : undefined,
    })
  }
}

test('deployment verification accepts a protected PostgreSQL API', async () => {
  const checks = await verifyDeployment('https://api.example.com/api', {
    token: 'smoke-token',
    fetchImpl: createFetch({
      '/api/ready': { status: 200, body: { ready: true, database: 'postgres', graphStore: 'sqlite' }, requestId: 'ready-1' },
      '/api/health': { status: 200, body: { status: 'operational', database: 'postgres', authRequired: true, agentProvider: 'mastra-remote' }, requestId: 'health-1' },
      '/api/interim-status': { status: 200, body: { readyForDemo: true }, requestId: 'status-1' },
    }),
  })
  assert.equal(checks.every((check) => check.passed), true)
})

test('deployment verification rejects a SQLite or unauthenticated deployment', async () => {
  const checks = await verifyDeployment('https://api.example.com/api', {
    fetchImpl: createFetch({
      '/api/ready': { status: 200, body: { ready: true, database: 'sqlite' }, requestId: 'ready-1' },
      '/api/health': { status: 200, body: { status: 'operational', database: 'sqlite', authRequired: false, agentProvider: 'local-fallback' }, requestId: 'health-1' },
      '/api/interim-status': { status: 200, body: { readyForDemo: true }, requestId: 'status-1' },
    }),
  })
  assert.equal(checks.find((check) => check.name === 'Smoke token provided')?.passed, false)
  assert.equal(checks.find((check) => check.name === 'Readiness endpoint')?.passed, false)
  assert.equal(checks.find((check) => check.name === 'Health endpoint')?.passed, false)
})

test('deployment verification rejects malformed API URLs before making requests', async () => {
  const checks = await verifyDeployment('api.example.com')
  assert.deepEqual(checks, [{ name: 'Deployment API URL', passed: false, detail: 'Use an http(s) URL ending with /api' }])
})
