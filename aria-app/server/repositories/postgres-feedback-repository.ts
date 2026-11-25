import type { Pool, PoolClient } from 'pg'
import type { AsyncFeedbackRepository } from './feedback-repository.js'

export function createPostgresFeedbackRepository(client: Pick<Pool | PoolClient, 'query'>): AsyncFeedbackRepository {
  return {
    async insertFeedback(entry) {
      await client.query(`
        INSERT INTO feedback (id, message_id, conversation_id, rating, feedback_type, comment, edited_response, quality_score, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        entry.id, entry.messageId, entry.conversationId, entry.rating ?? null, entry.feedbackType,
        entry.comment ?? null, entry.editedResponse ?? null, entry.qualityScore, entry.createdAt,
      ])
    },
  }
}
