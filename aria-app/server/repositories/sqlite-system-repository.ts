import type { DatabaseSync } from 'node:sqlite'
import type { SystemRepository } from './system-repository.js'

export function createSqliteSystemRepository(db: DatabaseSync): SystemRepository {
  return {
    verifyConnection() {
      db.prepare('SELECT 1').get()
    },
    getRecordCounts() {
      const conversations = db.prepare('SELECT COUNT(*) AS count FROM conversations').get() as { count: number }
      const feedback = db.prepare('SELECT COUNT(*) AS count FROM feedback').get() as { count: number }
      return { conversations: conversations.count, feedbackRecords: feedback.count }
    },
  }
}
