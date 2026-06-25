export type AgentResponse = {
  answer: string
  confidence: number
  sources: string[]
  sourceScores: Array<{ title: string; score: number }>
  retrievalMethod: 'semantic' | 'keyword' | 'none'
  generationProvider: 'mastra-gemini' | 'local-knowledge'
  shouldEscalate: boolean
}

export interface AgentService {
  generateResponse(query: string): Promise<AgentResponse>
}

export type KnowledgeSnippet = {
  title: string
  category: string
  content: string
  score?: number
  retrievalMethod?: 'semantic' | 'keyword'
}

export type KnowledgeRetriever = (query: string) => Promise<KnowledgeSnippet[]>

const responses = [
  {
    match: ['refund', 'money back'],
    answer:
      'Your refund is normally posted within 5-7 business days after approval. If the expected date has passed, I can escalate this to the payments team for a trace.',
    sources: ['Refund and return policy', 'Payment provider guide'],
  },
  {
    match: ['password', 'locked out', 'login'],
    answer:
      'You can reset your password from Account Settings > Security > Reset Password. A secure reset link will be sent to your registered email address.',
    sources: ['Password reset procedure', 'Account security policy'],
  },
  {
    match: ['delivery', 'address', 'shipping'],
    answer:
      'Delivery details can be changed before the order enters dispatch. Share the order number and I will check whether the address can still be updated.',
    sources: ['Order delivery FAQ', 'Address change procedure'],
  },
  {
    match: ['damaged', 'broken', 'cracked'],
    answer:
      'I am sorry the product arrived damaged. Please share the order number, clear photos of the damage, packaging condition, and delivery date so the replacement request can be reviewed.',
    sources: ['Damaged product resolution'],
  },
  {
    match: ['subscription', 'cancel', 'renewal'],
    answer:
      'Subscriptions can be cancelled before the renewal date. If renewal already happened, I will need to check refund eligibility before promising a reversal.',
    sources: ['Subscription terms'],
  },
  {
    match: ['payment failed', 'bank shows a charge', 'charged', 'payment'],
    answer:
      'Please verify the card details, billing address, bank approval, and available balance. If your bank shows a charge but no order was created, this should be escalated to the payments team.',
    sources: ['Payment failure troubleshooting'],
  },
  {
    match: ['saved card', 'card details', 'payment details', 'private information', 'privacy'],
    answer:
      'I cannot share saved card details, full payment details, passwords, access tokens, or private account information in chat. For privacy-related requests, identity must be verified and the case should be routed to the privacy support queue.',
    sources: ['Data privacy response'],
  },
  {
    match: ['loyalty', 'points', 'reward'],
    answer:
      'Missing loyalty points can be adjusted after confirming the order ID, account email, purchase date, and expected points. If the transaction is older than 30 days, it should be escalated for review.',
    sources: ['Loyalty points adjustment'],
  },
]

export class LocalAgentService implements AgentService {
  private readonly retrieveKnowledge: KnowledgeRetriever

  constructor(retrieveKnowledge: KnowledgeRetriever = async () => []) {
    this.retrieveKnowledge = retrieveKnowledge
  }

  async generateResponse(query: string): Promise<AgentResponse> {
    const normalized = query.toLowerCase()
    const result = responses.find((response) =>
      response.match.some((keyword) => normalized.includes(keyword)),
    )
    const knowledge = await this.retrieveKnowledge(query)
    const sources = knowledge.length > 0 ? knowledge.map((item) => item.title) : result?.sources ?? []
    const sourceScores = knowledge.flatMap((item) => (
      item.score === undefined
        ? []
        : [{ title: item.title, score: Number(item.score.toFixed(4)) }]
    ))
    const retrievalMethod = knowledge[0]?.retrievalMethod ?? 'none'

    if (!result) {
      if (knowledge.length > 0) {
        const primary = knowledge[0]
        return {
          answer: `Based on the ${primary.title.toLowerCase()}, ${primary.content} I recommend checking the customer details and escalating only if the request falls outside this policy.`,
          confidence: 0.78,
          sources,
          sourceScores,
          retrievalMethod,
          generationProvider: 'local-knowledge',
          shouldEscalate: false,
        }
      }

      return {
        answer:
          'I do not have enough verified business context to answer confidently. I can connect you with a support agent who can investigate this request.',
        confidence: 0.48,
        sources: [],
        sourceScores: [],
        retrievalMethod: 'none',
        generationProvider: 'local-knowledge',
        shouldEscalate: true,
      }
    }

    return {
      answer: result.answer,
      confidence: knowledge.length > 0 ? 0.94 : 0.91,
      sources,
      sourceScores,
      retrievalMethod,
      generationProvider: 'local-knowledge',
      shouldEscalate: false,
    }
  }
}

export class RemoteMastraAgentService implements AgentService {
  private readonly endpoint: string
  private readonly fallback: AgentService
  private readonly retrieveKnowledge: KnowledgeRetriever

  constructor(endpoint: string, fallback: AgentService, retrieveKnowledge: KnowledgeRetriever = async () => []) {
    this.endpoint = endpoint
    this.fallback = fallback
    this.retrieveKnowledge = retrieveKnowledge
  }

  async generateResponse(query: string): Promise<AgentResponse> {
    try {
      const knowledge = await this.retrieveKnowledge(query)
      const knowledgeContext = knowledge.length > 0
        ? knowledge.map((item) => `- ${item.title} (${item.category}): ${item.content}`).join('\n')
        : '- No matching knowledge record was found.'
      const prompt = `
Customer question:
${query}

Verified ARIA knowledge base:
${knowledgeContext}

Answer using only the verified knowledge above. If the knowledge is missing or unclear, ask for more details or recommend escalation.
`

      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }),
      })

      if (!response.ok) throw new Error(`Mastra responded with ${response.status}`)

      const body = await response.json() as Record<string, unknown>
      const text = extractMastraText(body)
      if (!text) throw new Error('Mastra response did not contain text')

      return {
        answer: text,
        confidence: knowledge.length > 0 ? 0.88 : 0.62,
        sources: knowledge.length > 0 ? knowledge.map((item) => item.title) : ['Mastra agent'],
        sourceScores: knowledge.flatMap((item) => (
          item.score === undefined
            ? []
            : [{ title: item.title, score: Number(item.score.toFixed(4)) }]
        )),
        retrievalMethod: knowledge[0]?.retrievalMethod ?? 'none',
        generationProvider: 'mastra-gemini',
        shouldEscalate: knowledge.length === 0,
      }
    } catch {
      return this.fallback.generateResponse(query)
    }
  }
}

export function createAgentService(retrieveKnowledge: KnowledgeRetriever) {
  const fallback = new LocalAgentService(retrieveKnowledge)
  const mastraEndpoint = process.env.MASTRA_AGENT_URL?.trim()

  if (mastraEndpoint) return new RemoteMastraAgentService(mastraEndpoint, fallback, retrieveKnowledge)
  return fallback
}

export function getAgentProvider() {
  return process.env.MASTRA_AGENT_URL?.trim() ? 'mastra-remote' : 'local-knowledge-agent'
}

function extractMastraText(body: Record<string, unknown>) {
  if (typeof body.text === 'string') return body.text
  if (typeof body.answer === 'string') return body.answer
  const result = body.result as Record<string, unknown> | undefined
  if (typeof result?.text === 'string') return result.text
  return ''
}
