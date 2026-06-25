export type View = 'inbox' | 'customer' | 'knowledge' | 'analytics'

export interface Conversation {
  id: number
  customer: string
  initials: string
  subject: string
  preview: string
  time: string
  priority: 'High' | 'Normal'
  unread: boolean
}

export interface KnowledgeItem {
  id?: number
  title: string
  category: string
  content?: string
  updated: string
  status: 'Indexed' | 'Review'
  uses: number
}

export interface NewKnowledgeItem {
  title: string
  category: string
  content: string
  status: 'indexed' | 'review'
}

export interface QualityTrendData {
  day: string
  quality: number
  rating: number
}

export interface TopicData {
  topic: string
  conversations: number
}

export interface ChatMessage {
  from: string
  text: string
  id?: string
  conversationId?: number
  confidence?: number
  sources?: string[]
  sourceScores?: Array<{ title: string; score: number }>
  retrievalMethod?: 'semantic' | 'keyword' | 'none'
  generationProvider?: 'mastra-gemini' | 'local-knowledge'
}

export interface AnalyticsSummary {
  conversations: number
  averageRating: number
  averageQuality: number
  acceptanceRate: number
  correctionRate: number
  feedbackRecords: number
  topics: TopicData[]
}

