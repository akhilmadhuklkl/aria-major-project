import { db } from '../database.js'
import type { FeedbackRepository } from './feedback-repository.js'

export const sqliteFeedbackRepository: FeedbackRepository = {
  insertFeedback(entry) {
    db.prepare(`
      INSERT INTO feedback (id, message_id, conversation_id, rating, feedback_type, comment, edited_response, quality_score, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      entry.id, entry.messageId, entry.conversationId, entry.rating ?? null, entry.feedbackType,
      entry.comment ?? null, entry.editedResponse ?? null, entry.qualityScore, entry.createdAt,
    )
  },
}
