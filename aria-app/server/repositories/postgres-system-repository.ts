import type { Pool, PoolClient } from 'pg'
import type { AsyncSystemRepository } from './system-repository.js'

type CountRow = { count: string | number }
const toNumber = (value: string | number | null | undefined) => Number(value ?? 0)

export function createPostgresSystemRepository(client: Pick<Pool | PoolClient, 'query'>): AsyncSystemRepository {
  return {
    async verifyConnection() {
      await client.query('SELECT 1')
    },
    async getRecordCounts() {
      const [conversations, feedback] = await Promise.all([
        client.query<CountRow>('SELECT COUNT(*)::int AS count FROM conversations'),
        client.query<CountRow>('SELECT COUNT(*)::int AS count FROM feedback'),
      ])
      return {
        conversations: toNumber(conversations.rows[0]?.count),
        feedbackRecords: toNumber(feedback.rows[0]?.count),
      }
    },
  }
}
