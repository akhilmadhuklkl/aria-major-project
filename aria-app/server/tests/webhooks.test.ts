import assert from 'node:assert/strict'
import test from 'node:test'
import { createWebhookSubscription, deleteWebhookSubscription, listWebhookDeliveries, listWebhookSubscriptions, signWebhookPayload } from '../webhooks.js'

test('webhook signatures are deterministic HMAC SHA-256 values', () => {
  assert.equal(signWebhookPayload('secret', '{"ok":true}'), 'f6b4a2841c93f8bf2fb8f2c13d8fb0b6c8e8019f09ee405d248daa8385fad638')
})

test('webhook listing never exposes delivery secrets', () => {
  const subscription = createWebhookSubscription({
    name: 'Secret visibility test',
    url: `https://example.com/aria-test-${Date.now()}`,
    events: ['knowledge.indexed'],
  })
  const listed = listWebhookSubscriptions().find((item) => item.id === subscription.id) as Record<string, unknown> | undefined
  assert.ok(listed)
  assert.equal('secret' in listed, false)
  assert.equal(listed?.url, subscription.url)
  assert.equal(deleteWebhookSubscription(subscription.id), true)
})

test('webhook delivery history is safe to expose', () => {
  const subscription = createWebhookSubscription({
    name: 'Delivery history test',
    url: `https://example.com/aria-history-${Date.now()}`,
    events: ['knowledge.indexed'],
  })
  try {
    assert.equal(listWebhookDeliveries().some((item) => Number((item as { webhookId: number }).webhookId) === subscription.id), false)
    assert.equal('secret' in (listWebhookDeliveries()[0] ?? {}), false)
  } finally {
    deleteWebhookSubscription(subscription.id)
  }
})
