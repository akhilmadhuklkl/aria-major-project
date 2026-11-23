import assert from 'node:assert/strict'
import test from 'node:test'
import { LocalAgentService } from '../agent-service.js'

test('confidence threshold controls escalation for low-confidence answers', async () => {
  const previous = process.env.AI_CONFIDENCE_THRESHOLD
  process.env.AI_CONFIDENCE_THRESHOLD = '0.8'
  try {
    const agent = new LocalAgentService(async () => [])
    const response = await agent.generateResponse('What is the weather forecast for tomorrow?')
    assert.equal(response.confidence, 0.48)
    assert.equal(response.shouldEscalate, true)
  } finally {
    if (previous === undefined) delete process.env.AI_CONFIDENCE_THRESHOLD
    else process.env.AI_CONFIDENCE_THRESHOLD = previous
  }
})
