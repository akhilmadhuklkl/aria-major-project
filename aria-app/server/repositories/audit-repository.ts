export type NewAuditLog = {
  actorUserId?: number
  actorEmail?: string
  action: string
  entityType: string
  entityId?: string | number
  metadata?: Record<string, unknown>
}

export type AuditLogRecord = {
  id: number
  actorUserId: number | null
  actorEmail: string | null
  action: string
  entityType: string
  entityId: string | null
  metadata: Record<string, unknown>
  createdAt: string
}

export interface AuditRepository {
  createAuditLog(input: NewAuditLog): NewAuditLog & { id: number; createdAt: string }
  listAuditLogs(limit?: number): AuditLogRecord[]
}
