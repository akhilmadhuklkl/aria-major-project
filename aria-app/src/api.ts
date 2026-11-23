import type { AgentThreadMessage, AnalyticsSummary, AuditLog, AuthUser, Conversation, GraphNode, GraphRelationship, KnowledgeItem, NewKnowledgeItem, Notification, SourceScore, SystemStatus, WebhookSubscription } from './types'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8787/api'
const AUTH_TOKEN_KEY = 'aria.auth.token'

type ChatResponse = {
  id: string
  conversationId: number
  answer: string
  confidence: number
  sources: string[]
  sourceScores: SourceScore[]
  retrievalMethod: 'hybrid' | 'semantic' | 'keyword' | 'none'
  generationProvider: 'mastra-gemini' | 'local-knowledge'
  shouldEscalate: boolean
}

type ConversationRow = {
  id: number
  customer: string
  subject: string
  status: string
  priority: string
  assignedTo?: string | null
  tags?: string[]
  escalated?: boolean
  updatedAt: string
}

export class ApiError extends Error {
  readonly status: number
  readonly requestId?: string

  constructor(message: string, status: number, requestId?: string) {
    super(requestId ? `${message} (Request ID: ${requestId})` : message)
    this.name = 'ApiError'
    this.status = status
    this.requestId = requestId
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = window.localStorage.getItem(AUTH_TOKEN_KEY)
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: 'Request failed' })) as { error?: string; requestId?: string }
    throw new ApiError(body.error ?? `Request failed with status ${response.status}`, response.status, body.requestId ?? response.headers.get('X-Request-ID') ?? undefined)
  }

  return response.json() as Promise<T>
}

export const api = {
  async getHealth() {
    return request<{ authRequired: boolean; authSetupAvailable: boolean }>('/health')
  },

  getNotifications() {
    return request<Notification[]>('/notifications')
  },

  getAuditLogs(limit = 20) {
    return request<AuditLog[]>(`/audit-logs?limit=${limit}`)
  },

  getWebhooks() {
    return request<WebhookSubscription[]>('/integrations/webhooks')
  },

  createWebhook(input: { name: string; url: string; events: string[] }) {
    return request<WebhookSubscription>('/integrations/webhooks', { method: 'POST', body: JSON.stringify(input) })
  },

  deleteWebhook(id: number) {
    return request<{ deleted: boolean }>(`/integrations/webhooks/${id}`, { method: 'DELETE' })
  },

  getGraphNodes() {
    return request<GraphNode[]>('/knowledge-graph/nodes')
  },

  getKnowledgeGraph() {
    return request<{ nodes: GraphNode[]; relationships: GraphRelationship[] }>('/knowledge-graph')
  },

  createGraphNode(input: { id: string; type: string; properties: Record<string, string> }) {
    return request<GraphNode>('/knowledge-graph/nodes', { method: 'POST', body: JSON.stringify(input) })
  },

  createGraphRelationship(input: { sourceId: string; targetId: string; type: string }) {
    return request<GraphRelationship>('/knowledge-graph/relationships', { method: 'POST', body: JSON.stringify(input) })
  },

  deleteGraphNode(id: string) {
    return request<{ deleted: boolean }>(`/knowledge-graph/nodes/${encodeURIComponent(id)}`, { method: 'DELETE' })
  },

  deleteGraphRelationship(input: { sourceId: string; targetId: string; type: string }) {
    return request<{ deleted: boolean }>('/knowledge-graph/relationships', { method: 'DELETE', body: JSON.stringify(input) })
  },

  getGraphPaths(id: string) {
    return request<{ node: GraphNode; paths: Array<{ nodes: string[]; relationships: string[] }> }>(`/knowledge-graph/paths/${encodeURIComponent(id)}`)
  },

  markAllNotificationsRead() {
    return request<{ markedRead: number }>('/notifications/read-all', { method: 'POST' })
  },

  markNotificationRead(id: number) {
    return request<{ read: boolean }>(`/notifications/${id}/read`, { method: 'POST' })
  },

  async login(email: string, password: string) {
    const result = await request<{ user: AuthUser; token: string; expiresAt: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    window.localStorage.setItem(AUTH_TOKEN_KEY, result.token)
    return result.user
  },

  async bootstrap(input: { email: string; displayName: string; password: string }) {
    const result = await request<{ user: AuthUser; token: string; expiresAt: string }>('/auth/bootstrap', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    window.localStorage.setItem(AUTH_TOKEN_KEY, result.token)
    return result.user
  },

  async getCurrentUser() {
    const result = await request<{ user: AuthUser }>('/auth/me')
    return result.user
  },

  async logout() {
    try {
      await request<void>('/auth/logout', { method: 'POST' })
    } finally {
      window.localStorage.removeItem(AUTH_TOKEN_KEY)
    }
  },

  chat(message: string, conversationId?: number, language = 'en') {
    return request<ChatResponse>('/chat', {
      method: 'POST',
      body: JSON.stringify({ message, conversationId, language }),
    })
  },

  async chatStream(message: string, conversationId: number | undefined, language: string, onChunk: (text: string) => void) {
    const token = window.localStorage.getItem(AUTH_TOKEN_KEY)
    const response = await fetch(`${API_BASE_URL}/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ message, conversationId, language }),
    })
    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: 'Request failed' })) as { error?: string; requestId?: string }
      throw new ApiError(body.error ?? `Request failed with status ${response.status}`, response.status, body.requestId ?? response.headers.get('X-Request-ID') ?? undefined)
    }
    if (!response.body) throw new Error('Streaming response is unavailable.')

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let completed: ChatResponse | undefined
    while (true) {
      const { done, value } = await reader.read()
      buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done })
      const events = buffer.split('\n\n')
      buffer = events.pop() ?? ''
      for (const event of events) {
        const line = event.split('\n').find((entry) => entry.startsWith('data: '))
        if (!line) continue
        const payload = JSON.parse(line.slice(6)) as { type: string; text?: string; response?: ChatResponse; message?: string; requestId?: string }
        if (payload.type === 'chunk' && payload.text) onChunk(payload.text)
        if (payload.type === 'complete' && payload.response) completed = payload.response
        if (payload.type === 'error') throw new ApiError(payload.message ?? 'Streaming response failed.', 500, payload.requestId)
      }
      if (done) break
    }
    if (!completed) throw new Error('Streaming response ended before completion.')
    return completed
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

  updateConversation(id: number, input: Partial<Pick<Conversation, 'status' | 'priority' | 'assignedTo' | 'tags' | 'escalated'>>) {
    return request(`/conversations/${id}`, { method: 'PATCH', body: JSON.stringify(input) })
  },

  async getConversationPage(limit = 50, offset = 0): Promise<{ items: Conversation[]; total: number; hasMore: boolean }> {
    const result = await request<{ items: Array<ConversationRow>; total: number; hasMore: boolean }>(`/conversations/page?limit=${limit}&offset=${offset}`)
    return { ...result, items: result.items.map(mapConversationRow) }
  },

  async getConversations(): Promise<Conversation[]> {
    const rows = await request<Array<ConversationRow>>('/conversations')
    return rows.map(mapConversationRow)
  },

  async getConversationMessages(id: number): Promise<AgentThreadMessage[]> {
    const rows = await request<Array<{ role: string; content: string; createdAt: string }>>(`/conversations/${id}/messages`)
    return rows.map((row) => ({
      from: (row.role === 'customer' || row.role === 'user' ? 'customer' : row.role === 'system' ? 'system' : 'agent') as AgentThreadMessage['from'],
      text: row.content,
      time: new Date(row.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
    }))
  },

  async exportConversation(id: number) {
    const token = window.localStorage.getItem(AUTH_TOKEN_KEY)
    const response = await fetch(`${API_BASE_URL}/conversations/${id}/export`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: 'Conversation export failed' }))
      throw new Error(body.error ?? `Conversation export failed with status ${response.status}`)
    }
    return response.blob()
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

  async uploadKnowledge(file: File, category = 'FAQ', title?: string): Promise<KnowledgeItem> {
    const token = window.localStorage.getItem(AUTH_TOKEN_KEY)
    const form = new FormData()
    form.append('file', file)
    form.append('category', category)
    if (title?.trim()) form.append('title', title.trim())

    const response = await fetch(`${API_BASE_URL}/knowledge/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    })
    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: 'Upload failed' }))
      throw new Error(body.error ?? `Upload failed with status ${response.status}`)
    }

    const row = await response.json() as {
      id: number
      title: string
      category: string
      content: string
      status: string
      uses: number
      updatedAt: string
    }
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

  async updateKnowledge(id: number, input: NewKnowledgeItem): Promise<KnowledgeItem> {
    const row = await request<{
      id: number
      title: string
      category: string
      content: string
      status: string
      uses: number
      updatedAt: string
    }>(`/knowledge/${id}`, {
      method: 'PUT',
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

  archiveKnowledge(ids: number[]) {
    return request<{ archived: number }>('/knowledge/archive', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    })
  },

  getKnowledgeVersions(id: number) {
    return request<Array<{
      id: number
      knowledgeDocumentId: number
      version: number
      title: string
      category: string
      content: string
      sourceFilename: string | null
      createdAt: string
      archivedAt: string | null
    }>>(`/knowledge/${id}/versions`)
  },

  deleteKnowledge(ids: number[]) {
    return request<{ deleted: number }>('/knowledge', {
      method: 'DELETE',
      body: JSON.stringify({ ids }),
    })
  },

  getAnalytics(range = '7d') {
    return request<AnalyticsSummary>(`/analytics/summary?range=${encodeURIComponent(range)}`)
  },

  getSystemStatus() {
    return request<SystemStatus>('/system-status')
  },
}

function formatRelativeTime(value: string) {
  const elapsedMinutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60_000))
  if (elapsedMinutes < 60) return `${elapsedMinutes}m`
  const elapsedHours = Math.round(elapsedMinutes / 60)
  if (elapsedHours < 24) return `${elapsedHours}h`
  return `${Math.round(elapsedHours / 24)}d`
}

function mapConversationRow(row: ConversationRow): Conversation {
  return {
    id: row.id,
    customer: row.customer,
    initials: row.customer.split(/\s+/).map((part) => part[0] ?? '').join('').slice(0, 2).toUpperCase(),
    subject: row.subject,
    orderNumber: `AR-${String(20000 + row.id)}`,
    preview: row.subject,
    time: formatRelativeTime(row.updatedAt),
    priority: row.priority.toLowerCase() === 'high' ? 'High' : 'Normal',
    unread: false,
    status: row.status.toLowerCase() === 'pending' ? 'Pending' : row.status.toLowerCase() === 'resolved' ? 'Resolved' : 'Open',
    assignedTo: row.assignedTo ?? undefined,
    tags: row.tags ?? [],
    escalated: Boolean(row.escalated),
  }
}
