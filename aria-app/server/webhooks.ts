import { createHmac, randomBytes } from 'node:crypto'
import { sqliteWebhookRepository } from './repositories/sqlite-webhook-repository.js'
import type { StoredWebhookSubscription } from './repositories/webhook-repository.js'

export type WebhookEvent = 'feedback.low_rating' | 'agent_action.corrected' | 'knowledge.indexed'
export const webhookEvents: WebhookEvent[] = ['feedback.low_rating', 'agent_action.corrected', 'knowledge.indexed']
type WebhookSubscription = StoredWebhookSubscription
export type PublicWebhookSubscription = Omit<WebhookSubscription, 'secret'>

export function validateWebhookUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password && Boolean(url.hostname)
  } catch {
    return false
  }
}

export function normalizeWebhookEvents(events: string[]) {
  const allowed = new Set(webhookEvents)
  const normalized = [...new Set(events)].filter((event) => event === '*' || allowed.has(event as WebhookEvent))
  return normalized.length > 0 ? normalized : ['*']
}

export function createWebhookSubscription(input: { name: string; url: string; events?: string[] }) {
  const now = new Date().toISOString()
  const secret = randomBytes(24).toString('hex')
  const events = normalizeWebhookEvents(input.events ?? [])
  const id = sqliteWebhookRepository.insertSubscription({ name: input.name, url: input.url, secret, events, createdAt: now, updatedAt: now })
  return { id, name: input.name, url: input.url, events, active: true, secret, createdAt: now }
}

function listWebhookSubscriptionsWithSecrets(): WebhookSubscription[] {
  return sqliteWebhookRepository.listSubscriptionsWithSecrets()
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
  return sqliteWebhookRepository.deleteSubscription(id)
}

export function updateWebhookSubscription(id: number, active: boolean) {
  return sqliteWebhookRepository.updateSubscription(id, active, new Date().toISOString())
}

export function listWebhookDeliveries(limit = 30) {
  return sqliteWebhookRepository.listDeliveries(limit)
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
        sqliteWebhookRepository.insertDelivery({ webhookId: subscription.id, event, status: 'delivered', responseStatus, attempts, createdAt: new Date().toISOString() })
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
  sqliteWebhookRepository.insertDelivery({ webhookId: subscription.id, event, status: 'failed', responseStatus, attempts: attempts - 1, error: lastError.slice(0, 500), createdAt: new Date().toISOString() })
  return false
}
