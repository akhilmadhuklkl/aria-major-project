import type { Pool, PoolClient } from 'pg'
import type { AsyncWebhookRepository, NewWebhookDelivery, StoredWebhookDelivery, StoredWebhookSubscription } from './webhook-repository.js'

type SubscriptionRow = Omit<StoredWebhookSubscription, 'id' | 'createdAt' | 'updatedAt' | 'events'> & {
  id: string | number
  events: unknown
  createdAt: Date | string
  updatedAt: Date | string
}

type DeliveryRow = Omit<StoredWebhookDelivery, 'id' | 'webhookId' | 'createdAt'> & {
  id: string | number
  webhookId: string | number
  createdAt: Date | string
}

const subscriptionColumns = 'id, name, url, secret, events, active, created_at AS "createdAt", updated_at AS "updatedAt"'
const deliveryColumns = `webhook_delivery_logs.id, webhook_delivery_logs.webhook_id AS "webhookId",
  webhook_subscriptions.name, webhook_delivery_logs.event, webhook_delivery_logs.status,
  webhook_delivery_logs.response_status AS "responseStatus", webhook_delivery_logs.attempts,
  webhook_delivery_logs.error, webhook_delivery_logs.created_at AS "createdAt"`

const toIso = (value: Date | string) => new Date(value).toISOString()

function toEvents(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String)
  if (typeof value === 'string') {
    const parsed = JSON.parse(value) as unknown
    return Array.isArray(parsed) ? parsed.map(String) : []
  }
  return []
}

function toSubscription(row: SubscriptionRow): StoredWebhookSubscription {
  return {
    id: Number(row.id), name: row.name, url: row.url, secret: row.secret,
    events: toEvents(row.events), active: Boolean(row.active),
    createdAt: toIso(row.createdAt), updatedAt: toIso(row.updatedAt),
  }
}

function toDelivery(row: DeliveryRow): StoredWebhookDelivery {
  return {
    id: Number(row.id), webhookId: Number(row.webhookId), name: row.name, event: row.event,
    status: row.status, responseStatus: row.responseStatus, attempts: row.attempts,
    error: row.error, createdAt: toIso(row.createdAt),
  }
}

export function createPostgresWebhookRepository(client: Pick<Pool | PoolClient, 'query'>): AsyncWebhookRepository {
  return {
    async insertSubscription(input) {
      const result = await client.query<{ id: string | number }>(`
        INSERT INTO webhook_subscriptions (name, url, secret, events, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6) RETURNING id
      `, [input.name, input.url, input.secret, JSON.stringify(input.events), input.createdAt, input.updatedAt])
      return Number(result.rows[0].id)
    },
    async listSubscriptionsWithSecrets() {
      const result = await client.query<SubscriptionRow>(`SELECT ${subscriptionColumns} FROM webhook_subscriptions ORDER BY created_at DESC`)
      return result.rows.map(toSubscription)
    },
    async deleteSubscription(id) {
      const result = await client.query('DELETE FROM webhook_subscriptions WHERE id = $1', [id])
      return (result.rowCount ?? 0) > 0
    },
    async updateSubscription(id, active, updatedAt) {
      const result = await client.query('UPDATE webhook_subscriptions SET active = $1, updated_at = $2 WHERE id = $3', [active, updatedAt, id])
      return (result.rowCount ?? 0) > 0
    },
    async insertDelivery(input: NewWebhookDelivery) {
      await client.query(`
        INSERT INTO webhook_delivery_logs (webhook_id, event, status, response_status, attempts, error, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [input.webhookId, input.event, input.status, input.responseStatus, input.attempts, input.error ?? null, input.createdAt])
    },
    async listDeliveries(limit = 30) {
      const result = await client.query<DeliveryRow>(`
        SELECT ${deliveryColumns}
        FROM webhook_delivery_logs
        JOIN webhook_subscriptions ON webhook_subscriptions.id = webhook_delivery_logs.webhook_id
        ORDER BY webhook_delivery_logs.created_at DESC LIMIT $1
      `, [Math.max(1, Math.min(limit, 100))])
      return result.rows.map(toDelivery)
    },
  }
}
