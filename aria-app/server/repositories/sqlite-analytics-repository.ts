import type { DatabaseSync } from 'node:sqlite'
import type { AnalyticsRepository } from './analytics-repository.js'

export function createSqliteAnalyticsRepository(db: DatabaseSync): AnalyticsRepository {
  return {
    getAnalyticsMetrics(since, confidenceThreshold) {
      const dateClause = since ? ' WHERE created_at >= ?' : ''
      const dateArgs = since ? [since] : []
      const conversationCount = db.prepare(`SELECT COUNT(*) AS count FROM conversations${dateClause}`).get(...dateArgs) as { count: number }
      const feedbackStats = db.prepare(`
        SELECT COUNT(*) AS count, COALESCE(AVG(rating), 0) AS averageRating, COALESCE(AVG(quality_score), 0) AS averageQuality
        FROM feedback${dateClause}
      `).get(...dateArgs) as { count: number; averageRating: number; averageQuality: number }
      const accepted = db.prepare(`SELECT COUNT(*) AS count FROM feedback WHERE feedback_type = 'accepted'${since ? ' AND created_at >= ?' : ''}`).get(...dateArgs) as { count: number }
      const corrected = db.prepare(`SELECT COUNT(*) AS count FROM feedback WHERE feedback_type = 'edited'${since ? ' AND created_at >= ?' : ''}`).get(...dateArgs) as { count: number }
      const topicRows = db.prepare(`
        SELECT topic, COUNT(*) AS conversations FROM conversations${dateClause} GROUP BY topic ORDER BY conversations DESC
      `).all(...dateArgs) as Array<{ topic: string; conversations: number }>

      const rejected = db.prepare(`SELECT COUNT(*) AS count FROM feedback WHERE feedback_type = 'rejected'${since ? ' AND created_at >= ?' : ''}`).get(...dateArgs) as { count: number }
      const retrievalRows = db.prepare(`
        SELECT COALESCE(retrieval_method, 'none') AS method, COUNT(*) AS count
         FROM messages${dateClause} GROUP BY COALESCE(retrieval_method, 'none') ORDER BY count DESC
      `).all(...dateArgs) as Array<{ method: string; count: number }>
      const providerRows = db.prepare(`
        SELECT COALESCE(generation_provider, 'unknown') AS provider, COUNT(*) AS count
        FROM messages WHERE role = 'assistant'${since ? ' AND created_at >= ?' : ''}
        GROUP BY generation_provider ORDER BY count DESC
      `).all(...dateArgs) as Array<{ provider: string; count: number }>
      const escalationCount = db.prepare(`SELECT COUNT(*) AS count FROM messages WHERE should_escalate = 1${since ? ' AND created_at >= ?' : ''}`).get(...dateArgs) as { count: number }
      const responseMessageCount = db.prepare(`SELECT COUNT(*) AS count FROM messages WHERE role = 'assistant'${since ? ' AND created_at >= ?' : ''}`).get(...dateArgs) as { count: number }
      const latencyStats = db.prepare(`SELECT COALESCE(AVG(latency_ms), 0) AS averageLatencyMs FROM messages WHERE role = 'assistant'${since ? ' AND created_at >= ?' : ''}`).get(...dateArgs) as { averageLatencyMs: number }
      const confidenceStats = db.prepare(`SELECT COALESCE(AVG(confidence), 0) AS averageConfidence FROM messages WHERE role = 'assistant' AND confidence IS NOT NULL${since ? ' AND created_at >= ?' : ''}`).get(...dateArgs) as { averageConfidence: number }
      const groundedResponseCount = db.prepare(`SELECT COUNT(*) AS count FROM messages WHERE role = 'assistant' AND sources IS NOT NULL AND sources != '[]'${since ? ' AND created_at >= ?' : ''}`).get(...dateArgs) as { count: number }
      const highConfidenceCount = db.prepare(`SELECT COUNT(*) AS count FROM messages WHERE role = 'assistant' AND confidence >= ?${since ? ' AND created_at >= ?' : ''}`).get(confidenceThreshold, ...dateArgs) as { count: number }
      const lowConfidenceCount = db.prepare(`SELECT COUNT(*) AS count FROM messages WHERE role = 'assistant' AND confidence IS NOT NULL AND confidence < ?${since ? ' AND created_at >= ?' : ''}`).get(confidenceThreshold, ...dateArgs) as { count: number }

      const qualityTrend = db.prepare(`
        SELECT substr(created_at, 1, 10) AS day,
          COALESCE(AVG(quality_score), 0) AS quality,
          COALESCE(AVG(rating), 0) AS rating
        FROM feedback
        WHERE quality_score IS NOT NULL${since ? ' AND created_at >= ?' : ''}
        GROUP BY substr(created_at, 1, 10)
        ORDER BY day ASC
      `).all(...dateArgs) as Array<{ day: string; quality: number; rating: number }>
      return { conversationCount, feedbackStats, accepted, corrected, topicRows, rejected, retrievalRows, providerRows, escalationCount, responseMessageCount, latencyStats, confidenceStats, groundedResponseCount, highConfidenceCount, lowConfidenceCount, qualityTrend }
    },
  }
}
