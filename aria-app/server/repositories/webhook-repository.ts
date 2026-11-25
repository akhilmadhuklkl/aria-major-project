export type StoredWebhookSubscription = {
  id: number
  name: string
  url: string
  secret: string
  events: string[]
  active: boolean
  createdAt: string
  updatedAt: string
}

export type NewWebhookDelivery = {
  webhookId: number
  event: string
  status: 'delivered' | 'failed'
  responseStatus: number | null
  attempts: number
  error?: string | null
  createdAt: string
}

export type StoredWebhookDelivery = NewWebhookDelivery & { id: number; name: string }

export interface WebhookRepository {
  insertSubscription(input: Omit<StoredWebhookSubscription, 'id' | 'active'>): number
  listSubscriptionsWithSecrets(): StoredWebhookSubscription[]
  deleteSubscription(id: number): boolean
  updateSubscription(id: number, active: boolean, updatedAt: string): boolean
  insertDelivery(input: NewWebhookDelivery): void
  listDeliveries(limit?: number): StoredWebhookDelivery[]
}

export interface AsyncWebhookRepository {
  insertSubscription(input: Omit<StoredWebhookSubscription, 'id' | 'active'>): Promise<number>
  listSubscriptionsWithSecrets(): Promise<StoredWebhookSubscription[]>
  deleteSubscription(id: number): Promise<boolean>
  updateSubscription(id: number, active: boolean, updatedAt: string): Promise<boolean>
  insertDelivery(input: NewWebhookDelivery): Promise<void>
  listDeliveries(limit?: number): Promise<StoredWebhookDelivery[]>
}
