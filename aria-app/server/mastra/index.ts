import { Mastra } from '@mastra/core'
import { ariaSupportAgent } from './agents/aria-support-agent.js'

export const mastra = new Mastra({
  agents: {
    ariaSupportAgent,
  },
})

