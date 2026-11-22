import assert from 'node:assert/strict'
import test from 'node:test'
import { calculateFeedbackAdjustment, rankWithFeedback } from '../feedback-adaptation.js'

test('feedback adjustment stays within the configured bound', () => {
  const adjustment = calculateFeedbackAdjustment({
    title: 'Refund policy', feedbackCount: 100, averageQuality: 100, averageRating: 5,
    acceptedCount: 10, editedCount: 0, rejectedCount: 0,
  })
  assert.ok(adjustment > 0)
  assert.ok(adjustment <= 0.03)
})

test('feedback ranker promotes higher-quality sources when similarity is close', () => {
  const ranked = rankWithFeedback([
    { id: 1, title: 'Weak source', category: 'FAQ', content: '', status: 'indexed', uses: 0, updatedAt: '', similarity: 0.8 },
    { id: 2, title: 'Strong source', category: 'FAQ', content: '', status: 'indexed', uses: 0, updatedAt: '', similarity: 0.79 },
  ], [{ title: 'Strong source', feedbackCount: 20, averageQuality: 100, averageRating: 5, acceptedCount: 20, editedCount: 0, rejectedCount: 0 }])
  assert.equal(ranked[0].title, 'Strong source')
})
