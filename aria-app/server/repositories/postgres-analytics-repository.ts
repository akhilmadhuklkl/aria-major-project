import type { Pool, PoolClient } from 'pg'
import type { AsyncAnalyticsRepository } from './analytics-repository.js'

type CountRow = { count: string | number }
type FeedbackStatsRow = CountRow & { averageRating: string | number; averageQuality: string | number }
type TopicRow = { topic: string; conversations: string | number }
type RetrievalRow = { method: string; count: string | number }
type ProviderRow = { provider: string; count: string | number }
type AverageRow = { value: string | number }
type QualityTrendRow = { day: string; quality: string | number; rating: string | number }

const toNumber = (value: string | number | null | undefined) => Number(value ?? 0)
const count = (row: CountRow): { count: number } => ({ count: toNumber(row.count) })

export function createPostgresAnalyticsRepository(client: Pick<Pool | PoolClient, 'query'>): AsyncAnalyticsRepository {
  return {
    async getAnalyticsMetrics(since, confidenceThreshold) {
      const dateFilter = since ? ' AND created_at >= $1' : ''
      const dateArgs = since ? [since] : []
      const messageDateFilter = since ? ' AND created_at >= $1' : ''
      const feedbackDateFilter = since ? ' AND created_at >= $1' : ''

      const conversationCount = await client.query<CountRow>(`SELECT COUNT(*)::int AS count FROM conversations WHERE TRUE${dateFilter}`, dateArgs)
      const feedbackStats = await client.query<FeedbackStatsRow>(`
        SELECT COUNT(*)::int AS count, COALESCE(AVG(rating), 0)::float8 AS "averageRating",
          COALESCE(AVG(quality_score), 0)::float8 AS "averageQuality"
        FROM feedback WHERE TRUE${feedbackDateFilter}
      `, dateArgs)
      const accepted = await client.query<CountRow>(`SELECT COUNT(*)::int AS count FROM feedback WHERE feedback_type = 'accepted'${feedbackDateFilter}`, dateArgs)
      const corrected = await client.query<CountRow>(`SELECT COUNT(*)::int AS count FROM feedback WHERE feedback_type = 'edited'${feedbackDateFilter}`, dateArgs)
      const rejected = await client.query<CountRow>(`SELECT COUNT(*)::int AS count FROM feedback WHERE feedback_type = 'rejected'${feedbackDateFilter}`, dateArgs)
      const topicRows = await client.query<TopicRow>(`SELECT topic, COUNT(*)::int AS conversations FROM conversations WHERE TRUE${dateFilter} GROUP BY topic ORDER BY conversations DESC`, dateArgs)
      const retrievalRows = await client.query<RetrievalRow>(`
        SELECT COALESCE(retrieval_method, 'none') AS method, COUNT(*)::int AS count
        FROM messages WHERE TRUE${messageDateFilter}
        GROUP BY COALESCE(retrieval_method, 'none') ORDER BY count DESC
      `, dateArgs)
      const providerRows = await client.query<ProviderRow>(`
        SELECT COALESCE(generation_provider, 'unknown') AS provider, COUNT(*)::int AS count
        FROM messages WHERE role = 'assistant'${messageDateFilter}
        GROUP BY generation_provider ORDER BY count DESC
      `, dateArgs)
      const escalationCount = await client.query<CountRow>(`SELECT COUNT(*)::int AS count FROM messages WHERE should_escalate = TRUE${messageDateFilter}`, dateArgs)
      const responseMessageCount = await client.query<CountRow>(`SELECT COUNT(*)::int AS count FROM messages WHERE role = 'assistant'${messageDateFilter}`, dateArgs)
      const latencyStats = await client.query<AverageRow>(`SELECT COALESCE(AVG(latency_ms), 0)::float8 AS value FROM messages WHERE role = 'assistant'${messageDateFilter}`, dateArgs)
      const confidenceStats = await client.query<AverageRow>(`SELECT COALESCE(AVG(confidence), 0)::float8 AS value FROM messages WHERE role = 'assistant' AND confidence IS NOT NULL${messageDateFilter}`, dateArgs)
      const groundedResponseCount = await client.query<CountRow>(`SELECT COUNT(*)::int AS count FROM messages WHERE role = 'assistant' AND sources IS NOT NULL AND sources <> '[]'::jsonb${messageDateFilter}`, dateArgs)
      const highConfidenceCount = await client.query<CountRow>(`SELECT COUNT(*)::int AS count FROM messages WHERE role = 'assistant' AND confidence >= $1${since ? ' AND created_at >= $2' : ''}`, since ? [confidenceThreshold, since] : [confidenceThreshold])
      const lowConfidenceCount = await client.query<CountRow>(`SELECT COUNT(*)::int AS count FROM messages WHERE role = 'assistant' AND confidence IS NOT NULL AND confidence < $1${since ? ' AND created_at >= $2' : ''}`, since ? [confidenceThreshold, since] : [confidenceThreshold])
      const qualityTrend = await client.query<QualityTrendRow>(`
        SELECT TO_CHAR(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day,
          COALESCE(AVG(quality_score), 0)::float8 AS quality, COALESCE(AVG(rating), 0)::float8 AS rating
        FROM feedback WHERE quality_score IS NOT NULL${feedbackDateFilter}
        GROUP BY TO_CHAR(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') ORDER BY day ASC
      `, dateArgs)

      const feedback = feedbackStats.rows[0] ?? { count: 0, averageRating: 0, averageQuality: 0 }
      return {
        conversationCount: count(conversationCount.rows[0] ?? { count: 0 }),
        feedbackStats: { count: toNumber(feedback.count), averageRating: toNumber(feedback.averageRating), averageQuality: toNumber(feedback.averageQuality) },
        accepted: count(accepted.rows[0] ?? { count: 0 }),
        corrected: count(corrected.rows[0] ?? { count: 0 }),
        rejected: count(rejected.rows[0] ?? { count: 0 }),
        topicRows: topicRows.rows.map((row) => ({ topic: row.topic, conversations: toNumber(row.conversations) })),
        retrievalRows: retrievalRows.rows.map((row) => ({ method: row.method, count: toNumber(row.count) })),
        providerRows: providerRows.rows.map((row) => ({ provider: row.provider, count: toNumber(row.count) })),
        escalationCount: count(escalationCount.rows[0] ?? { count: 0 }),
        responseMessageCount: count(responseMessageCount.rows[0] ?? { count: 0 }),
        latencyStats: { averageLatencyMs: toNumber(latencyStats.rows[0]?.value) },
        confidenceStats: { averageConfidence: toNumber(confidenceStats.rows[0]?.value) },
        groundedResponseCount: count(groundedResponseCount.rows[0] ?? { count: 0 }),
        highConfidenceCount: count(highConfidenceCount.rows[0] ?? { count: 0 }),
        lowConfidenceCount: count(lowConfidenceCount.rows[0] ?? { count: 0 }),
        qualityTrend: qualityTrend.rows.map((row) => ({ day: row.day, quality: toNumber(row.quality), rating: toNumber(row.rating) })),
      }
    },
  }
}
