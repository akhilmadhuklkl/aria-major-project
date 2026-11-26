import assert from 'node:assert/strict'
import test from 'node:test'
import { calculateQualityScore, inferTopic } from '../support-domain.js'

test('support topic inference remains deterministic and case-insensitive', () => {
  assert.equal(inferTopic('How long will my REFUND take?'), 'Refunds')
  assert.equal(inferTopic('I cannot access my login email'), 'Accounts')
  assert.equal(inferTopic('Where is my parcel delivery?'), 'Delivery')
  assert.equal(inferTopic('Tell me something unrelated'), 'General')
})

test('quality scoring clamps customer ratings and agent actions', () => {
  assert.equal(calculateQualityScore(5), 100)
  assert.equal(calculateQualityScore(1), 20)
  assert.equal(calculateQualityScore(undefined, 'accepted'), 75)
  assert.equal(calculateQualityScore(undefined, 'rejected'), 40)
})
