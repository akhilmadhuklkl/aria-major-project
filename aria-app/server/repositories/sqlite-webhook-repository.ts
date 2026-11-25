import { db } from '../database.js'
import type { StoredWebhookDelivery, WebhookRepository } from './webhook-repository.js'

export const sqliteWebhookRepository: WebhookRepository = {
  insertSubscription(input) {
    return Number(db.prepare(`
      INSERT INTO webhook_subscriptions (name, url, secret, events, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(input.name, input.url, input.secret, JSON.stringify(input.events), input.createdAt, input.updatedAt).lastInsertRowid)
  },
  listSubscriptionsWithSecrets() {
    return db.prepare(`
      SELECT id, name, url, secret, events, active, created_at AS createdAt, updated_at AS updatedAt
      FROM webhook_subscriptions ORDER BY created_at DESC
    `).all().map((row) => ({
      id: Number(row.id), name: String(row.name), url: String(row.url), secret: String(row.secret),
      events: JSON.parse(String(row.events)) as string[], active: Boolean(row.active),
      createdAt: String(row.createdAt), updatedAt: String(row.updatedAt),
    }))
  },
  deleteSubscription(id) {
    return db.prepare('DELETE FROM webhook_subscriptions WHERE id = ?').run(id).changes > 0
  },
  updateSubscription(id, active, updatedAt) {
    return db.prepare('UPDATE webhook_subscriptions SET active = ?, updated_at = ? WHERE id = ?')
      .run(active ? 1 : 0, updatedAt, id).changes > 0
  },
  insertDelivery(input) {
    db.prepare(`
      INSERT INTO webhook_delivery_logs (webhook_id, event, status, response_status, attempts, error, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(input.webhookId, input.event, input.status, input.responseStatus, input.attempts, input.error ?? null, input.createdAt)
  },
  listDeliveries(limit = 30) {
    return db.prepare(`
      SELECT webhook_delivery_logs.id, webhook_delivery_logs.webhook_id AS webhookId,
        webhook_subscriptions.name, webhook_delivery_logs.event, webhook_delivery_logs.status,
        webhook_delivery_logs.response_status AS responseStatus, webhook_delivery_logs.attempts,
        webhook_delivery_logs.error, webhook_delivery_logs.created_at AS createdAt
      FROM webhook_delivery_logs
      JOIN webhook_subscriptions ON webhook_subscriptions.id = webhook_delivery_logs.webhook_id
      ORDER BY webhook_delivery_logs.created_at DESC LIMIT ?
    `).all(Math.max(1, Math.min(limit, 100))) as StoredWebhookDelivery[]
  },
}
