import assert from 'node:assert/strict'
import test from 'node:test'
import { db } from '../database.js'
import { sqliteWebhookRepository as repository } from '../repositories/sqlite-webhook-repository.js'
import { runWebhookRepositoryContract } from './contracts/repository-contracts.js'

test('webhook repository preserves subscription and delivery fields and cascades deletion', () => {
  db.exec('BEGIN')
  try {
    const now = new Date().toISOString()
    const input = {
      name: 'Webhook Repository Test', url: `https://example.com/${crypto.randomUUID()}`,
      secret: 'test-only-secret', events: ['knowledge.indexed'], createdAt: now, updatedAt: now,
    }
    const id = repository.insertSubscription(input)
    assert.deepEqual(repository.listSubscriptionsWithSecrets().find((item) => item.id === id), { id, ...input, active: true })
    const updatedAt = new Date(Date.now() + 1000).toISOString()
    assert.equal(repository.updateSubscription(id, false, updatedAt), true)
    const paused = repository.listSubscriptionsWithSecrets().find((item) => item.id === id)
    assert.equal(paused?.active, false)
    assert.equal(paused?.updatedAt, updatedAt)
    const delivery = { webhookId: id, event: 'knowledge.indexed', status: 'failed' as const, responseStatus: 503, attempts: 3, error: 'HTTP 503', createdAt: now }
    repository.insertDelivery(delivery)
    const stored = repository.listDeliveries(100).find((item) => item.webhookId === id)
    assert.ok(stored)
    assert.deepEqual({ ...stored }, { id: stored.id, name: input.name, ...delivery })
    assert.equal('secret' in stored, false)
    assert.equal(repository.deleteSubscription(id), true)
    assert.equal(repository.deleteSubscription(id), false)
    assert.equal(repository.updateSubscription(id, true, now), false)
    const remaining = db.prepare('SELECT COUNT(*) AS count FROM webhook_delivery_logs WHERE webhook_id = ?').get(id) as { count: number }
    assert.equal(remaining.count, 0)
  } finally {
    db.exec('ROLLBACK')
  }
})

test('SQLite webhook repository satisfies the shared cross-engine contract', async () => {
  db.exec('BEGIN')
  try {
    await runWebhookRepositoryContract(repository, `sqlite-webhook-${Date.now()}`)
  } finally {
    db.exec('ROLLBACK')
  }
})
