import { db } from '../database.js'
import type { AuditLogRecord, AuditRepository } from './audit-repository.js'

export const sqliteAuditRepository: AuditRepository = {
  createAuditLog(input) {
    const createdAt = new Date().toISOString()
    const result = db.prepare(`
      INSERT INTO audit_logs (actor_user_id, actor_email, action, entity_type, entity_id, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      input.actorUserId ?? null, input.actorEmail ?? 'local-demo', input.action, input.entityType,
      input.entityId === undefined ? null : String(input.entityId), JSON.stringify(input.metadata ?? {}), createdAt,
    )
    return { id: Number(result.lastInsertRowid), ...input, createdAt }
  },
  listAuditLogs(limit = 50) {
    return db.prepare(`
      SELECT id, actor_user_id AS actorUserId, actor_email AS actorEmail,
        action, entity_type AS entityType, entity_id AS entityId, metadata, created_at AS createdAt
      FROM audit_logs ORDER BY created_at DESC LIMIT ?
    `).all(Math.max(1, Math.min(limit, 100))).map((row) => ({
      ...row, metadata: JSON.parse(String(row.metadata ?? '{}')),
    })) as AuditLogRecord[]
  },
}
