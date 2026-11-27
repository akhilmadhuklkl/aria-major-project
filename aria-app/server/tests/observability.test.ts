import assert from 'node:assert/strict'
import test from 'node:test'
import { errorMessage, logEvent } from '../observability.js'

test('structured logging includes service context and request metadata', () => {
  const originalFormat = process.env.LOG_FORMAT
  const originalLog = console.log
  const lines: string[] = []
  process.env.LOG_FORMAT = 'json'
  console.log = (line?: unknown) => lines.push(String(line))

  try {
    logEvent('info', 'http.request', { requestId: 'request-1', status: 200 })
  } finally {
    console.log = originalLog
    if (originalFormat === undefined) delete process.env.LOG_FORMAT
    else process.env.LOG_FORMAT = originalFormat
  }

  const payload = JSON.parse(lines[0] ?? '{}') as Record<string, unknown>
  assert.equal(payload.service, 'aria-api')
  assert.equal(payload.level, 'info')
  assert.equal(payload.event, 'http.request')
  assert.equal(payload.requestId, 'request-1')
  assert.equal(payload.status, 200)
  assert.equal(typeof payload.timestamp, 'string')
})

test('errorMessage normalizes unknown thrown values', () => {
  assert.equal(errorMessage(new Error('failed')), 'failed')
  assert.equal(errorMessage('failed'), 'failed')
})
