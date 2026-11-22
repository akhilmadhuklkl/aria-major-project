import assert from 'node:assert/strict'
import test from 'node:test'
import { signWebhookPayload } from '../webhooks.js'

test('webhook signatures are deterministic HMAC SHA-256 values', () => {
  assert.equal(signWebhookPayload('secret', '{"ok":true}'), 'f6b4a2841c93f8bf2fb8f2c13d8fb0b6c8e8019f09ee405d248daa8385fad638')
})
