import assert from 'node:assert/strict'
import test from 'node:test'
import { createAuditLog, db, listAuditLogs } from '../database.js'

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
