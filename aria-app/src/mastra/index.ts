import { Mastra } from '@mastra/core'
import { ariaSupportAgent } from './agents/aria-support-agent.js'
import { supportResponseWorkflow } from './workflows/support-response-workflow.js'

export const mastra = new Mastra({
  agents: {
    ariaSupportAgent,
  },
  workflows: {
    supportResponseWorkflow,
  },
})
