import assert from 'node:assert/strict'
import test from 'node:test'
import { db } from '../database.js'
import { sqliteConversationRepository } from '../repositories/sqlite-conversation-repository.js'
import { sqliteFeedbackRepository } from '../repositories/sqlite-feedback-repository.js'

test('feedback repository preserves customer and agent feedback with nullable fields', () => {
  db.exec('BEGIN')
  try {
    const now = new Date().toISOString()
    const conversation = sqliteConversationRepository.createConversation({
      customerName: 'Feedback Contract Test', subject: 'Feedback persistence', status: 'open',
      priority: 'normal', topic: 'General', tags: [], escalated: false, createdAt: now, updatedAt: now,
    })
    const messageId = crypto.randomUUID()
    sqliteConversationRepository.appendMessage({
      id: messageId, conversationId: conversation.id, role: 'assistant', content: 'Test answer',
      shouldEscalate: false, createdAt: now,
    })
    for (const feedbackType of ['customer_rating', 'accepted', 'edited', 'rejected']) {
      const entry = {
        id: crypto.randomUUID(), messageId, conversationId: conversation.id, feedbackType,
        qualityScore: 0.75, createdAt: now,
        ...(feedbackType === 'customer_rating' ? { rating: 4, comment: 'Helpful' } : {}),
        ...(feedbackType === 'edited' ? { editedResponse: 'Corrected answer' } : {}),
      }
      sqliteFeedbackRepository.insertFeedback(entry)
      const row = db.prepare('SELECT * FROM feedback WHERE id = ?').get(entry.id)
      assert.ok(row)
      assert.deepEqual({ ...row }, {
        id: entry.id, message_id: messageId, conversation_id: conversation.id,
        rating: entry.rating ?? null, feedback_type: feedbackType, comment: entry.comment ?? null,
        edited_response: entry.editedResponse ?? null, quality_score: entry.qualityScore, created_at: now,
      })
    }
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM feedback WHERE conversation_id = ?').get(conversation.id) as { count: number }).count, 4)
  } finally {
    db.exec('ROLLBACK')
  }
})
