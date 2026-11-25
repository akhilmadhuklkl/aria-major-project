import assert from 'node:assert/strict'
import test from 'node:test'
import type { Pool } from 'pg'
import { createPostgresWebhookRepository } from '../repositories/postgres-webhook-repository.js'

test('PostgreSQL webhooks parameterize JSON events and protect delivery secrets', async () => {
  const calls: Array<{ sql: string; values: unknown[] }> = []
  const timestamp = '2026-01-01T00:00:00.000Z'
  const query = async (sql: string, values: unknown[] = []) => {
    calls.push({ sql, values })
    if (sql.includes('RETURNING id')) return { rows: [{ id: '42' }], rowCount: 1 }
    if (sql.includes('FROM webhook_subscriptions')) return {
      rows: [{ id: '42', name: 'Support hook', url: 'https://example.com/hook', secret: 'secret', events: ['knowledge.indexed'], active: true, createdAt: new Date(timestamp), updatedAt: new Date(timestamp) }], rowCount: 1,
    }
    if (sql.includes('FROM webhook_delivery_logs')) return {
      rows: [{ id: '7', webhookId: '42', name: 'Support hook', event: 'knowledge.indexed', status: 'failed', responseStatus: 503, attempts: 3, error: 'HTTP 503', createdAt: new Date(timestamp) }], rowCount: 1,
    }
    return { rows: [], rowCount: 1 }
  }
  const repository = createPostgresWebhookRepository({ query } as unknown as Pick<Pool, 'query'>)
  const now = new Date(timestamp).toISOString()
  const input = { name: 'Support hook', url: 'https://example.com/hook', secret: 'secret', events: ['knowledge.indexed'], createdAt: now, updatedAt: now }

  assert.equal(await repository.insertSubscription(input), 42)
  assert.deepEqual(calls[0].values.slice(0, 4), [input.name, input.url, input.secret, JSON.stringify(input.events)])
  assert.deepEqual(await repository.listSubscriptionsWithSecrets(), [{ id: 42, ...input, active: true }])
  assert.equal(await repository.updateSubscription(42, false, now), true)
  await repository.insertDelivery({ webhookId: 42, event: 'knowledge.indexed', status: 'failed', responseStatus: 503, attempts: 3, error: 'HTTP 503', createdAt: now })
  const deliveries = await repository.listDeliveries(1000)
  assert.deepEqual(deliveries, [{ id: 7, webhookId: 42, name: input.name, event: 'knowledge.indexed', status: 'failed', responseStatus: 503, attempts: 3, error: 'HTTP 503', createdAt: timestamp }])
  assert.equal('secret' in deliveries[0], false)
  assert.equal(calls.at(-1)?.values[0], 100)
})

test('PostgreSQL webhooks report missing rows and propagate database errors', async () => {
  const empty = createPostgresWebhookRepository({ query: async () => ({ rows: [], rowCount: 0 }) } as unknown as Pick<Pool, 'query'>)
  assert.equal(await empty.deleteSubscription(-1), false)
  assert.equal(await empty.updateSubscription(-1, true, new Date().toISOString()), false)
  assert.deepEqual(await empty.listSubscriptionsWithSecrets(), [])
  assert.deepEqual(await empty.listDeliveries(), [])

  const failing = createPostgresWebhookRepository({ query: async () => { throw new Error('database unavailable') } } as unknown as Pick<Pool, 'query'>)
  await assert.rejects(failing.listSubscriptionsWithSecrets(), /database unavailable/)
})
