import { createHmac, randomBytes } from 'node:crypto'
import { db } from './database.js'

export type WebhookEvent = 'feedback.low_rating' | 'agent_action.corrected' | 'knowledge.indexed'
type WebhookSubscription = { id: number; name: string; url: string; secret: string; events: string[]; active: boolean; createdAt: string; updatedAt: string }
export type PublicWebhookSubscription = Omit<WebhookSubscription, 'secret'>

export function createWebhookSubscription(input: { name: string; url: string; events?: string[] }) {
  const now = new Date().toISOString()
  const secret = randomBytes(24).toString('hex')
  const result = db.prepare(`
    INSERT INTO webhook_subscriptions (name, url, secret, events, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(input.name, input.url, secret, JSON.stringify(input.events?.length ? input.events : ['*']), now, now)
  return { id: Number(result.lastInsertRowid), name: input.name, url: input.url, events: input.events?.length ? input.events : ['*'], active: true, secret, createdAt: now }
}

function listWebhookSubscriptionsWithSecrets(): WebhookSubscription[] {
  return db.prepare(`
    SELECT id, name, url, secret, events, active, created_at AS createdAt, updated_at AS updatedAt
    FROM webhook_subscriptions ORDER BY created_at DESC
  `).all().map((row) => {
    const item = row as Record<string, unknown>
    return {
      id: Number(item.id), name: String(item.name), url: String(item.url), secret: String(item.secret),
      events: JSON.parse(String(item.events)) as string[], active: Boolean(item.active),
      createdAt: String(item.createdAt), updatedAt: String(item.updatedAt),
    }
  })
}

export function listWebhookSubscriptions(): PublicWebhookSubscription[] {
  return listWebhookSubscriptionsWithSecrets().map((subscription) => ({
    id: subscription.id,
    name: subscription.name,
    url: subscription.url,
    events: subscription.events,
    active: subscription.active,
    createdAt: subscription.createdAt,
    updatedAt: subscription.updatedAt,
  }))
}

export function deleteWebhookSubscription(id: number) {
  return db.prepare('DELETE FROM webhook_subscriptions WHERE id = ?').run(id).changes > 0
}

export function updateWebhookSubscription(id: number, active: boolean) {
  return db.prepare('UPDATE webhook_subscriptions SET active = ?, updated_at = ? WHERE id = ?')
    .run(active ? 1 : 0, new Date().toISOString(), id).changes > 0
}

export function listWebhookDeliveries(limit = 30) {
  return db.prepare(`
    SELECT webhook_delivery_logs.id, webhook_delivery_logs.webhook_id AS webhookId,
      webhook_subscriptions.name, webhook_delivery_logs.event, webhook_delivery_logs.status,
      webhook_delivery_logs.response_status AS responseStatus, webhook_delivery_logs.attempts,
      webhook_delivery_logs.error, webhook_delivery_logs.created_at AS createdAt
    FROM webhook_delivery_logs
    JOIN webhook_subscriptions ON webhook_subscriptions.id = webhook_delivery_logs.webhook_id
    ORDER BY webhook_delivery_logs.created_at DESC LIMIT ?
  `).all(Math.max(1, Math.min(limit, 100)))
}

export function signWebhookPayload(secret: string, payload: string) {
  return createHmac('sha256', secret).update(payload).digest('hex')
}

export async function dispatchWebhookEvent(event: WebhookEvent, data: Record<string, unknown>) {
  const subscriptions = listWebhookSubscriptionsWithSecrets().filter((item) => item.active && (item.events.includes('*') || item.events.includes(event)))
  const payload = JSON.stringify({ event, data, deliveredAt: new Date().toISOString() })
  await Promise.allSettled(subscriptions.map((subscription) => deliverWebhook(subscription, event, payload)))
}

export async function testWebhookSubscription(id: number) {
  const subscription = listWebhookSubscriptionsWithSecrets().find((item) => item.id === id)
  if (!subscription) return undefined
  const payload = JSON.stringify({ event: 'knowledge.indexed', data: { test: true, source: 'ARIA webhook settings' }, deliveredAt: new Date().toISOString() })
  return deliverWebhook(subscription, 'knowledge.indexed', payload)
}

async function deliverWebhook(subscription: WebhookSubscription, event: WebhookEvent, payload: string) {
  let responseStatus: number | null = null
  let lastError = ''
  let attempts = 0
  for (attempts = 1; attempts <= 3; attempts += 1) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    try {
      const response = await fetch(String(subscription.url), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-ARIA-Event': event, 'X-ARIA-Signature': `sha256=${signWebhookPayload(String(subscription.secret), payload)}` },
        body: payload,
        signal: controller.signal,
      })
      responseStatus = response.status
      if (response.ok) {
        db.prepare(`INSERT INTO webhook_delivery_logs (webhook_id, event, status, response_status, attempts, created_at) VALUES (?, ?, 'delivered', ?, ?, ?)`)
          .run(subscription.id, event, responseStatus, attempts, new Date().toISOString())
        return true
      }
      lastError = `HTTP ${response.status}`
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'delivery failed'
    } finally {
      clearTimeout(timeout)
    }
    if (attempts < 3) await new Promise((resolve) => setTimeout(resolve, attempts * 250))
  }
  db.prepare(`INSERT INTO webhook_delivery_logs (webhook_id, event, status, response_status, attempts, error, created_at) VALUES (?, ?, 'failed', ?, ?, ?, ?)`)
    .run(subscription.id, event, responseStatus, attempts - 1, lastError.slice(0, 500), new Date().toISOString())
  return false
}
