import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import test from 'node:test'
import { createWebhookSubscription, deleteWebhookSubscription, dispatchWebhookEvent, listWebhookDeliveries, listWebhookSubscriptions, signWebhookPayload } from '../webhooks.js'

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

test('dispatches a signed webhook and records delivery success', async () => {
  let server: ReturnType<typeof createServer> | undefined
  const receivedPromise = new Promise<{ body: string; event: string | undefined; signature: string | undefined; url: string }>((resolve, reject) => {
    server = createServer((request, response) => {
      const chunks: Buffer[] = []
      request.on('data', (chunk: Buffer) => chunks.push(chunk))
      request.on('end', () => {
        resolve({
          body: Buffer.concat(chunks).toString('utf8'),
          event: request.headers['x-aria-event'] as string | undefined,
          signature: request.headers['x-aria-signature'] as string | undefined,
          url: `http://127.0.0.1:${(server?.address() as { port: number }).port}`,
        })
        response.writeHead(204)
        response.end()
      })
    })
    server.on('error', reject)
    server.listen(0, '127.0.0.1')
  })
  await new Promise<void>((resolve) => server?.once('listening', () => resolve()))
  const receivedUrl = `http://127.0.0.1:${(server?.address() as { port: number }).port}`

  const subscription = createWebhookSubscription({
    name: `Delivery success ${Date.now()}`,
    url: receivedUrl,
    events: ['knowledge.indexed'],
  })
  try {
    await dispatchWebhookEvent('knowledge.indexed', { title: 'Refund policy' })
    const received = await receivedPromise
    assert.equal(received.event, 'knowledge.indexed')
    assert.equal(JSON.parse(received.body).event, 'knowledge.indexed')
    assert.equal(received.signature, `sha256=${signWebhookPayload(subscription.secret, received.body)}`)
    assert.ok(listWebhookDeliveries().some((item) => Number((item as { webhookId: number }).webhookId) === subscription.id && (item as { status: string }).status === 'delivered'))
  } finally {
    deleteWebhookSubscription(subscription.id)
    await new Promise<void>((resolve) => server?.close(() => resolve()))
  }
})

test('retries failed webhook delivery three times and records the failure', async () => {
  const server = createServer((_request, response) => {
    attempts += 1
    response.writeHead(500)
    response.end('receiver unavailable')
  })
  let attempts = 0
  await new Promise<void>((resolve, reject) => {
    server?.once('error', reject)
    server?.listen(0, '127.0.0.1', () => resolve())
  })

  const subscription = createWebhookSubscription({
    name: `Delivery failure ${Date.now()}`,
    url: `http://127.0.0.1:${(server.address() as { port: number }).port}`,
    events: ['knowledge.indexed'],
  })
  try {
    await dispatchWebhookEvent('knowledge.indexed', { title: 'Unavailable policy receiver' })
    const delivery = listWebhookDeliveries().find((item) => Number((item as { webhookId: number }).webhookId) === subscription.id) as { status: string; attempts: number; responseStatus: number; error?: string } | undefined
    assert.equal(attempts, 3)
    assert.equal(delivery?.status, 'failed')
    assert.equal(delivery?.attempts, 3)
    assert.equal(delivery?.responseStatus, 500)
    assert.equal(delivery?.error, 'HTTP 500')
  } finally {
    deleteWebhookSubscription(subscription.id)
    await new Promise<void>((resolve) => server?.close(() => resolve()))
  }
})
