import type { Pool, PoolClient } from 'pg'
import type { AsyncAuditRepository, AuditLogRecord } from './audit-repository.js'

type AuditRow = Omit<AuditLogRecord, 'id' | 'actorUserId' | 'createdAt'> & {
  id: string | number
  actorUserId: string | number | null
  createdAt: Date | string
}

export function createPostgresAuditRepository(client: Pick<Pool | PoolClient, 'query'>): AsyncAuditRepository {
  return {
    async createAuditLog(input) {
      const createdAt = new Date().toISOString()
      const result = await client.query<{ id: string | number }>(`
        INSERT INTO audit_logs (actor_user_id, actor_email, action, entity_type, entity_id, metadata, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id
      `, [
        input.actorUserId ?? null, input.actorEmail ?? 'local-demo', input.action, input.entityType,
        input.entityId === undefined ? null : String(input.entityId), JSON.stringify(input.metadata ?? {}), createdAt,
      ])
      return { id: Number(result.rows[0].id), ...input, createdAt }
    },
    async listAuditLogs(limit = 50) {
      const result = await client.query<AuditRow>(`
        SELECT id, actor_user_id AS "actorUserId", actor_email AS "actorEmail",
          action, entity_type AS "entityType", entity_id AS "entityId", metadata, created_at AS "createdAt"
        FROM audit_logs ORDER BY created_at DESC LIMIT $1
      `, [Math.max(1, Math.min(limit, 100))])
      return result.rows.map((row) => ({
        ...row, id: Number(row.id), actorUserId: row.actorUserId === null ? null : Number(row.actorUserId),
        createdAt: new Date(row.createdAt).toISOString(),
      }))
    },
  }
}
