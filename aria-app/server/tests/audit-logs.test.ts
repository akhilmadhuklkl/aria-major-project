import assert from 'node:assert/strict'
import test from 'node:test'
import { db } from '../database.js'
import { ensureAuthSchema } from '../auth.js'
import { sqliteAuditRepository } from '../repositories/sqlite-audit-repository.js'
import { createRuntimeRepositories } from '../runtime-repositories.js'

const { createAuditLog, listAuditLogs } = sqliteAuditRepository

// Audit records reference users even when the actor is anonymous.
ensureAuthSchema()

test('audit logs persist action metadata without sensitive content', () => {
  const entry = createAuditLog({
    actorEmail: 'agent@example.com',
    action: 'agent.accepted',
    entityType: 'conversation',
    entityId: 1,
    metadata: { feedbackType: 'accepted' },
  })

  try {
    const stored = listAuditLogs().find((item) => Number((item as unknown as { id: number }).id) === entry.id) as {
      actorEmail: string
      action: string
      entityId: string
      metadata: { feedbackType: string }
    } | undefined
    assert.ok(stored)
    assert.equal(stored.actorEmail, 'agent@example.com')
    assert.equal(stored.action, 'agent.accepted')
    assert.equal(stored.entityId, '1')
    assert.equal(stored.metadata.feedbackType, 'accepted')
  } finally {
    db.prepare('DELETE FROM audit_logs WHERE id = ?').run(entry.id)
  }
})

test('audit repository retains defaults, entity identifiers, and structured metadata', () => {
  db.exec('BEGIN')
  try {
    const metadata = { active: false, events: ['knowledge.indexed'], details: { attempts: 3 } }
    const entry = createAuditLog({ action: 'webhook.paused', entityType: 'webhook', entityId: 0, metadata })
    const stored = listAuditLogs(100).find((item) => item.id === entry.id)
    assert.ok(stored)
    assert.equal(stored.actorUserId, null)
    assert.equal(stored.actorEmail, 'local-demo')
    assert.equal(stored.entityId, '0')
    assert.deepEqual(stored.metadata, metadata)
    assert.equal(stored.createdAt, entry.createdAt)
    const minimal = createAuditLog({ action: 'test', entityType: 'test' })
    const defaults = listAuditLogs(100).find((item) => item.id === minimal.id)
    assert.ok(defaults)
    assert.equal(defaults.entityId, null)
    assert.deepEqual(defaults.metadata, {})
    assert.equal(listAuditLogs(1).length, 1)
  } finally {
    db.exec('ROLLBACK')
  }
})

test('async runtime audit adapter preserves SQLite metadata', async () => {
  const runtime = createRuntimeRepositories('sqlite')
  const entry = await runtime.audit.createAuditLog({ action: 'runtime.test', entityType: 'test', entityId: 0, metadata: { passed: true } })
  try {
    const stored = (await runtime.audit.listAuditLogs(100)).find((item) => item.id === entry.id)
    assert.ok(stored)
    assert.equal(stored.entityId, '0')
    assert.deepEqual(stored.metadata, { passed: true })
  } finally {
    db.prepare('DELETE FROM audit_logs WHERE id = ?').run(entry.id)
    await runtime.close()
  }
})
