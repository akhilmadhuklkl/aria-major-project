import { createStep, createWorkflow } from '@mastra/core/workflows'
import { z } from 'zod'
import { ariaSupportAgent } from '../agents/aria-support-agent.js'

const responseStep = createStep(ariaSupportAgent)

/**
 * Studio-visible workflow for running the ARIA support agent as an explicit
 * orchestration primitive. The main Express chat path still owns persistence,
 * retrieval, confidence scoring, and fallback handling.
 */
export const supportResponseWorkflow = createWorkflow({
  id: 'support-response-workflow',
  description: 'Generate a customer-support response with the ARIA Support Agent.',
  inputSchema: z.object({ prompt: z.string().min(1) }),
  outputSchema: z.object({ text: z.string() }),
}).then(responseStep).commit()
