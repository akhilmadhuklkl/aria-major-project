import assert from 'node:assert/strict'
import test from 'node:test'
import { serializeJsonb } from '../scripts/postgres-json.js'

test('serializes SQLite JSON strings and JavaScript values for PostgreSQL JSONB parameters', () => {
  assert.equal(serializeJsonb('[0.5,-0.25]'), '[0.5,-0.25]')
  assert.equal(serializeJsonb(['refund', 'billing']), '["refund","billing"]')
  assert.equal(serializeJsonb({ active: false, count: 0 }), '{"active":false,"count":0}')
  assert.equal(serializeJsonb(null, []), '[]')
  assert.equal(serializeJsonb(undefined, { fallback: true }), '{"fallback":true}')
  assert.equal(serializeJsonb(null), null)
})

test('rejects malformed JSON from a SQLite JSON column', () => {
  assert.throws(() => serializeJsonb('{not-json}'), SyntaxError)
})
