import assert from 'node:assert/strict'
import test from 'node:test'
import { supportResponseWorkflow } from '../../src/mastra/workflows/support-response-workflow.js'

test('Mastra support-response workflow is committed with a Studio-visible step graph', () => {
  assert.equal(supportResponseWorkflow.id, 'support-response-workflow')
  assert.equal(supportResponseWorkflow.committed, true)
  assert.equal(supportResponseWorkflow.stepGraph.length, 1)
  assert.equal(supportResponseWorkflow.stepGraph[0]?.type, 'step')
})
