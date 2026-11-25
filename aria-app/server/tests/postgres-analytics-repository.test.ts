import assert from 'node:assert/strict'
import test from 'node:test'
import type { Pool } from 'pg'
import { createPostgresAnalyticsRepository } from '../repositories/postgres-analytics-repository.js'

test('PostgreSQL analytics maps aggregate rows and binds date and threshold filters', async () => {
  const calls: Array<{ sql: string; values: unknown[] }> = []
  const query = async (sql: string, values: unknown[] = []) => {
    calls.push({ sql, values })
    if (sql.includes('GROUP BY topic')) return { rows: [{ topic: 'Refunds', conversations: '2' }], rowCount: 1 }
    if (sql.includes('FROM conversations')) return { rows: [{ count: '2' }], rowCount: 1 }
    if (sql.includes('FROM feedback') && sql.includes('COUNT(*)::int') && sql.includes('averageRating')) return { rows: [{ count: '3', averageRating: '4', averageQuality: '80' }], rowCount: 1 }
    if (sql.includes("feedback_type = 'accepted'")) return { rows: [{ count: '1' }], rowCount: 1 }
    if (sql.includes("feedback_type = 'edited'")) return { rows: [{ count: '1' }], rowCount: 1 }
    if (sql.includes("feedback_type = 'rejected'")) return { rows: [{ count: '0' }], rowCount: 1 }
    if (sql.includes('GROUP BY COALESCE(retrieval_method')) return { rows: [{ method: 'hybrid', count: '2' }], rowCount: 1 }
    if (sql.includes('GROUP BY generation_provider')) return { rows: [{ provider: 'mastra-gemini', count: '2' }], rowCount: 1 }
    if (sql.includes('should_escalate')) return { rows: [{ count: '1' }], rowCount: 1 }
    if (sql.includes('AVG(latency_ms)')) return { rows: [{ value: '200' }], rowCount: 1 }
    if (sql.includes('AVG(confidence)')) return { rows: [{ value: '0.6' }], rowCount: 1 }
    if (sql.includes("sources <> '[]'::jsonb")) return { rows: [{ count: '1' }], rowCount: 1 }
    if (sql.includes('confidence >= $1')) return { rows: [{ count: '1' }], rowCount: 1 }
    if (sql.includes('confidence IS NOT NULL AND confidence < $1')) return { rows: [{ count: '1' }], rowCount: 1 }
    if (sql.includes("role = 'assistant'") && sql.includes('COUNT(*)')) return { rows: [{ count: '3' }], rowCount: 1 }
    if (sql.includes('TO_CHAR(created_at')) return { rows: [{ day: '2026-01-08', quality: '90', rating: '4' }], rowCount: 1 }
    return { rows: [], rowCount: 0 }
  }
  const repository = createPostgresAnalyticsRepository({ query } as unknown as Pick<Pool, 'query'>)
  const metrics = await repository.getAnalyticsMetrics('2026-01-08T00:00:00.000Z', 0.7)
  assert.equal(metrics.conversationCount.count, 2)
  assert.deepEqual(metrics.feedbackStats, { count: 3, averageRating: 4, averageQuality: 80 })
  assert.equal(metrics.latencyStats.averageLatencyMs, 200)
  assert.equal(metrics.confidenceStats.averageConfidence, 0.6)
  assert.deepEqual(metrics.topicRows, [{ topic: 'Refunds', conversations: 2 }])
  assert.deepEqual(metrics.qualityTrend, [{ day: '2026-01-08', quality: 90, rating: 4 }])
  assert.deepEqual(calls.find((call) => call.sql.includes('confidence >= $1'))?.values, [0.7, '2026-01-08T00:00:00.000Z'])
})

test('PostgreSQL analytics returns zero values for empty aggregate results', async () => {
  const repository = createPostgresAnalyticsRepository({ query: async () => ({ rows: [], rowCount: 0 }) } as unknown as Pick<Pool, 'query'>)
  const metrics = await repository.getAnalyticsMetrics(undefined, 0.7)
  assert.equal(metrics.conversationCount.count, 0)
  assert.deepEqual(metrics.feedbackStats, { count: 0, averageRating: 0, averageQuality: 0 })
  assert.equal(metrics.latencyStats.averageLatencyMs, 0)
  assert.equal(metrics.confidenceStats.averageConfidence, 0)
  assert.deepEqual(metrics.topicRows, [])
  assert.deepEqual(metrics.qualityTrend, [])
})
