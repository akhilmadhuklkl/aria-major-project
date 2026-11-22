import { createHmac, randomBytes } from 'node:crypto'
import { db } from './database.js'

export type WebhookEvent = 'feedback.low_rating' | 'agent_action.corrected' | 'knowledge.indexed'
type WebhookSubscription = { id: number; name: string; url: string; secret: string; events: string[]; active: boolean; createdAt: string; updatedAt: string }

export function createWebhookSubscription(input: { name: string; url: string; events?: string[] }) {
  const now = new Date().toISOString()
  const secret = randomBytes(24).toString('hex')
  const result = db.prepare(`
    INSERT INTO webhook_subscriptions (name, url, secret, events, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(input.name, input.url, secret, JSON.stringify(input.events?.length ? input.events : ['*']), now, now)
  return { id: Number(result.lastInsertRowid), name: input.name, url: input.url, events: input.events?.length ? input.events : ['*'], active: true, secret, createdAt: now }
}

export function listWebhookSubscriptions(): WebhookSubscription[] {
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

export function deleteWebhookSubscription(id: number) {
  return db.prepare('DELETE FROM webhook_subscriptions WHERE id = ?').run(id).changes > 0
}

export function signWebhookPayload(secret: string, payload: string) {
  return createHmac('sha256', secret).update(payload).digest('hex')
}

export async function dispatchWebhookEvent(event: WebhookEvent, data: Record<string, unknown>) {
  const subscriptions = listWebhookSubscriptions().filter((item) => item.active && (item.events.includes('*') || item.events.includes(event)))
  const payload = JSON.stringify({ event, data, deliveredAt: new Date().toISOString() })
  await Promise.allSettled(subscriptions.map(async (subscription) => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    try {
      await fetch(String(subscription.url), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-ARIA-Event': event, 'X-ARIA-Signature': `sha256=${signWebhookPayload(String(subscription.secret), payload)}` },
        body: payload,
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeout)
    }
  }))
}
