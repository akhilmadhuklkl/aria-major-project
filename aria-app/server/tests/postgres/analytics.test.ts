import assert from 'node:assert/strict'
import test from 'node:test'
import { Pool } from 'pg'
import { createPostgresAnalyticsRepository } from '../../repositories/postgres-analytics-repository.js'
import { runAnalyticsRepositoryContract } from '../contracts/repository-contracts.js'

test('PostgreSQL analytics preserves cutoff boundaries, grouping, and assistant metrics', async () => {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required for PostgreSQL integration tests')
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10_000, max: 1 })
  try {
    await pool.query(`
      CREATE TEMP TABLE conversations (topic TEXT, created_at TIMESTAMPTZ);
      CREATE TEMP TABLE feedback (rating INTEGER, quality_score DOUBLE PRECISION, feedback_type TEXT, created_at TIMESTAMPTZ);
      CREATE TEMP TABLE messages (role TEXT, retrieval_method TEXT, generation_provider TEXT, should_escalate BOOLEAN,
        latency_ms INTEGER, confidence DOUBLE PRECISION, sources JSONB, created_at TIMESTAMPTZ);
      SET search_path TO pg_temp;
    `)
    const repository = createPostgresAnalyticsRepository(pool)
    await pool.query('SAVEPOINT analytics_repository_contract')
    try {
      await runAnalyticsRepositoryContract(repository, async ({ old, since, recent }) => {
        await pool.query('INSERT INTO conversations VALUES ($1, $2), ($3, $4), ($5, $6)', ['Old topic', old, 'Refunds', since, 'Refunds', recent])
        await pool.query('INSERT INTO feedback VALUES ($1, $2, $3, $4), ($5, $6, $7, $8), ($9, $10, $11, $12), ($13, $14, $15, $16)', [1, 20, 'rejected', old, 4, 80, 'customer_rating', since, null, 100, 'accepted', since, null, 60, 'edited', recent])
        await pool.query('INSERT INTO messages VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8), ($9, $10, $11, $12, $13, $14, $15::jsonb, $16), ($17, $18, $19, $20, $21, $22, $23::jsonb, $24), ($25, $26, $27, $28, $29, $30, $31::jsonb, $32), ($33, $34, $35, $36, $37, $38, $39::jsonb, $40)', [
          'assistant', 'keyword', 'old-provider', true, 999, 0.1, '[]', old,
          'customer', null, null, false, null, null, null, since,
          'assistant', 'hybrid', 'mastra-gemini', false, 100, 0.7, '["Refund policy"]', since,
          'assistant', 'none', null, true, 300, 0.5, '[]', recent,
          'assistant', null, null, false, null, null, null, recent,
        ])
      })
    } finally {
      await pool.query('ROLLBACK TO SAVEPOINT analytics_repository_contract')
      await pool.query('RELEASE SAVEPOINT analytics_repository_contract')
    }
    const old = '2026-01-01T00:00:00.000Z'
    const since = '2026-01-08T00:00:00.000Z'
    const recent = '2026-01-09T00:00:00.000Z'
    await pool.query('INSERT INTO conversations VALUES ($1, $2), ($3, $4), ($5, $6)', ['Old topic', old, 'Refunds', since, 'Refunds', recent])
    await pool.query('INSERT INTO feedback VALUES ($1, $2, $3, $4), ($5, $6, $7, $8), ($9, $10, $11, $12), ($13, $14, $15, $16)', [1, 20, 'rejected', old, 4, 80, 'customer_rating', since, null, 100, 'accepted', since, null, 60, 'edited', recent])
    await pool.query('INSERT INTO messages VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8), ($9, $10, $11, $12, $13, $14, $15::jsonb, $16), ($17, $18, $19, $20, $21, $22, $23::jsonb, $24), ($25, $26, $27, $28, $29, $30, $31::jsonb, $32), ($33, $34, $35, $36, $37, $38, $39::jsonb, $40)', [
      'assistant', 'keyword', 'old-provider', true, 999, 0.1, '[]', old,
      'customer', null, null, false, null, null, null, since,
      'assistant', 'hybrid', 'mastra-gemini', false, 100, 0.7, '["Refund policy"]', since,
      'assistant', 'none', null, true, 300, 0.5, '[]', recent,
      'assistant', null, null, false, null, null, null, recent,
    ])
    const metrics = await repository.getAnalyticsMetrics(since, 0.7)
    assert.equal(metrics.conversationCount.count, 2)
    assert.deepEqual(metrics.feedbackStats, { count: 3, averageRating: 4, averageQuality: 80 })
    assert.equal(metrics.accepted.count, 1)
    assert.equal(metrics.corrected.count, 1)
    assert.equal(metrics.rejected.count, 0)
    assert.deepEqual(metrics.topicRows, [{ topic: 'Refunds', conversations: 2 }])
    assert.deepEqual(metrics.retrievalRows, [{ method: 'none', count: 3 }, { method: 'hybrid', count: 1 }])
    assert.deepEqual(metrics.providerRows, [{ provider: 'unknown', count: 2 }, { provider: 'mastra-gemini', count: 1 }])
    assert.equal(metrics.responseMessageCount.count, 3)
    assert.equal(metrics.escalationCount.count, 1)
    assert.equal(metrics.latencyStats.averageLatencyMs, 200)
    assert.equal(metrics.confidenceStats.averageConfidence, 0.6)
    assert.equal(metrics.groundedResponseCount.count, 1)
    assert.equal(metrics.highConfidenceCount.count, 1)
    assert.equal(metrics.lowConfidenceCount.count, 1)
    assert.deepEqual(metrics.qualityTrend, [{ day: '2026-01-08', quality: 90, rating: 4 }, { day: '2026-01-09', quality: 60, rating: 0 }])
    assert.equal((await repository.getAnalyticsMetrics(undefined, 0.7)).conversationCount.count, 3)
    assert.equal((await repository.getAnalyticsMetrics(since, 0.8)).highConfidenceCount.count, 0)
  } finally {
    await pool.end()
  }
})
