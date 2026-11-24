import assert from 'node:assert/strict'
import test from 'node:test'
import { getRuntimeMetrics, recordRequest } from '../metrics.js'

test('runtime metrics aggregate request volume, errors, and latency', () => {
  const before = getRuntimeMetrics()
  recordRequest({ method: 'GET', route: '/test-metrics', status: 200, latencyMs: 12 })
  recordRequest({ method: 'GET', route: '/test-metrics', status: 500, latencyMs: 28 })
  const after = getRuntimeMetrics()
  assert.equal(after.requests, before.requests + 2)
  assert.equal(after.errors, before.errors + 1)
  assert.equal(after.routes.find((route) => route.route === 'GET /test-metrics')?.requests, 2)
})
