import type { AnalyticsSummary, KnowledgeItem, NewKnowledgeItem } from './types'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8787/api'

type ChatResponse = {
  id: string
  conversationId: number
  answer: string
  confidence: number
  sources: string[]
  sourceScores: Array<{ title: string; score: number }>
  retrievalMethod: 'semantic' | 'keyword' | 'none'
  generationProvider: 'mastra-gemini' | 'local-knowledge'
  shouldEscalate: boolean
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(body.error ?? `Request failed with status ${response.status}`)
  }

  return response.json() as Promise<T>
}

export const api = {
  chat(message: string, conversationId?: number) {
    return request<ChatResponse>('/chat', {
      method: 'POST',
      body: JSON.stringify({ message, conversationId }),
    })
  },

  submitFeedback(input: { messageId: string; conversationId: number; rating: number }) {
    return request('/feedback', {
      method: 'POST',
      body: JSON.stringify({ ...input, feedbackType: 'customer_rating' }),
    })
  },

  submitAgentAction(input: { conversationId: number; action: 'accepted' | 'edited' | 'rejected'; editedResponse?: string }) {
    return request('/agent-actions', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  async getKnowledge(): Promise<KnowledgeItem[]> {
    const rows = await request<Array<{
      id: number
      title: string
      category: string
      content: string
      status: string
      uses: number
      updatedAt: string
    }>>('/knowledge')

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      category: row.category,
      content: row.content,
      status: row.status === 'review' ? 'Review' : 'Indexed',
      uses: row.uses,
      updated: new Date(row.updatedAt).toLocaleDateString(),
    }))
  },

  async addKnowledge(input: NewKnowledgeItem): Promise<KnowledgeItem> {
    const row = await request<{
      id: number
      title: string
      category: string
      content: string
      status: string
      uses: number
      updatedAt: string
    }>('/knowledge', {
      method: 'POST',
      body: JSON.stringify(input),
    })

    return {
      id: row.id,
      title: row.title,
      category: row.category,
      content: row.content,
      status: row.status === 'review' ? 'Review' : 'Indexed',
      uses: row.uses,
      updated: new Date(row.updatedAt).toLocaleDateString(),
    }
  },

  getAnalytics() {
    return request<AnalyticsSummary>('/analytics/summary')
  },
}
