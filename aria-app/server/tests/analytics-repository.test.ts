import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import test from 'node:test'
import { createSqliteAnalyticsRepository } from '../repositories/sqlite-analytics-repository.js'

function fixture() {
  const db = new DatabaseSync(':memory:')
  db.exec(`
    CREATE TABLE conversations (topic TEXT, created_at TEXT);
    CREATE TABLE feedback (rating INTEGER, quality_score REAL, feedback_type TEXT, created_at TEXT);
    CREATE TABLE messages (role TEXT, retrieval_method TEXT, generation_provider TEXT, should_escalate INTEGER,
      latency_ms INTEGER, confidence REAL, sources TEXT, created_at TEXT);
  `)
  return { db, repository: createSqliteAnalyticsRepository(db) }
}

test('analytics repository returns zero aggregates and empty series for an empty database', () => {
  const { db, repository } = fixture()
  try {
    for (const since of [undefined, '2026-01-01T00:00:00.000Z']) {
      const metrics = repository.getAnalyticsMetrics(since, 0.7)
      for (const count of [metrics.conversationCount, metrics.accepted, metrics.corrected, metrics.rejected,
        metrics.escalationCount, metrics.responseMessageCount, metrics.groundedResponseCount,
        metrics.highConfidenceCount, metrics.lowConfidenceCount]) assert.equal(count.count, 0)
      assert.deepEqual({ ...metrics.feedbackStats }, { count: 0, averageRating: 0, averageQuality: 0 })
      assert.equal(metrics.latencyStats.averageLatencyMs, 0)
      assert.equal(metrics.confidenceStats.averageConfidence, 0)
      for (const series of [metrics.topicRows, metrics.retrievalRows, metrics.providerRows, metrics.qualityTrend]) assert.deepEqual(series, [])
    }
  } finally { db.close() }
})

test('analytics repository preserves cutoff boundaries, grouping, and assistant response metrics', () => {
  const { db, repository } = fixture()
  try {
    const old = '2026-01-01T00:00:00.000Z'
    const since = '2026-01-08T00:00:00.000Z'
    const recent = '2026-01-09T00:00:00.000Z'
    const conversation = db.prepare('INSERT INTO conversations VALUES (?, ?)')
    conversation.run('Old topic', old)
    conversation.run('Refunds', since)
    conversation.run('Refunds', recent)
    const feedback = db.prepare('INSERT INTO feedback VALUES (?, ?, ?, ?)')
    feedback.run(1, 20, 'rejected', old)
    feedback.run(4, 80, 'customer_rating', since)
    feedback.run(null, 100, 'accepted', since)
    feedback.run(null, 60, 'edited', recent)
    const message = db.prepare('INSERT INTO messages VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    message.run('assistant', 'keyword', 'old-provider', 1, 999, 0.1, '[]', old)
    message.run('customer', null, null, 0, null, null, null, since)
    message.run('assistant', 'hybrid', 'mastra-gemini', 0, 100, 0.7, '["Refund policy"]', since)
    message.run('assistant', 'none', null, 1, 300, 0.5, '[]', recent)
    message.run('assistant', null, null, 0, null, null, null, recent)
    const metrics = repository.getAnalyticsMetrics(since, 0.7)
    assert.equal(metrics.conversationCount.count, 2)
    assert.deepEqual({ ...metrics.feedbackStats }, { count: 3, averageRating: 4, averageQuality: 80 })
    assert.equal(metrics.accepted.count, 1)
    assert.equal(metrics.corrected.count, 1)
    assert.equal(metrics.rejected.count, 0)
    assert.deepEqual(metrics.topicRows.map((row) => ({ ...row })), [{ topic: 'Refunds', conversations: 2 }])
    assert.deepEqual(metrics.retrievalRows.map((row) => ({ ...row })), [{ method: 'none', count: 3 }, { method: 'hybrid', count: 1 }])
    assert.deepEqual(metrics.providerRows.map((row) => ({ ...row })), [{ provider: 'unknown', count: 2 }, { provider: 'mastra-gemini', count: 1 }])
    assert.equal(metrics.responseMessageCount.count, 3)
    assert.equal(metrics.escalationCount.count, 1)
    assert.equal(metrics.latencyStats.averageLatencyMs, 200)
    assert.equal(metrics.confidenceStats.averageConfidence, 0.6)
    assert.equal(metrics.groundedResponseCount.count, 1)
    assert.equal(metrics.highConfidenceCount.count, 1)
    assert.equal(metrics.lowConfidenceCount.count, 1)
    assert.deepEqual(metrics.qualityTrend.map((row) => ({ ...row })), [
      { day: '2026-01-08', quality: 90, rating: 4 }, { day: '2026-01-09', quality: 60, rating: 0 },
    ])
    const all = repository.getAnalyticsMetrics(undefined, 0.7)
    assert.equal(all.conversationCount.count, 3)
    assert.equal(all.feedbackStats.count, 4)
    assert.equal(all.rejected.count, 1)
    assert.equal(all.escalationCount.count, 2)
    assert.equal(repository.getAnalyticsMetrics(since, 0.8).highConfidenceCount.count, 0)
  } finally { db.close() }
})
