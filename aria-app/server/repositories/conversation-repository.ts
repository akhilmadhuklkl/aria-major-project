export type ConversationStatus = 'open' | 'pending' | 'resolved'
export type ConversationPriority = 'low' | 'normal' | 'high'

export type ConversationRecord = {
  id: number
  customerName: string
  subject: string
  status: ConversationStatus
  priority: ConversationPriority
  topic: string
  assignedTo?: string | null
  tags: string[]
  escalated: boolean
  createdAt: string
  updatedAt: string
}

export type MessageRecord = {
  id: string
  conversationId: number
  role: string
  content: string
  confidence?: number | null
  sources?: string[] | null
  sourceScores?: Record<string, unknown>[] | null
  retrievalMethod?: string | null
  generationProvider?: string | null
  latencyMs?: number | null
  shouldEscalate: boolean
  createdAt: string
}

export interface ConversationRepository {
  listConversations(): ConversationRecord[]
  listConversationPage(limit: number, offset: number, search: string): {
    items: ConversationRecord[]; total: number
    queueCounts: { mine: number; unassigned: number; attention: number }
  }
  createConversation(input: Omit<ConversationRecord, 'id'>): ConversationRecord
  getConversation(id: number): ConversationRecord | undefined
  updateConversation(id: number, changes: Partial<Pick<ConversationRecord, 'status' | 'priority' | 'assignedTo' | 'tags' | 'escalated' | 'topic'>>): ConversationRecord | undefined
  appendMessage(message: MessageRecord): MessageRecord
  listMessages(conversationId: number): MessageRecord[]
  getCustomerContext(conversationId: number): { customer: string; totalConversations: number; openConversations: number; topics: Array<{ topic: string; count: number }>; history: Array<ConversationRecord & { lastMessage?: string | null }> } | undefined
}
