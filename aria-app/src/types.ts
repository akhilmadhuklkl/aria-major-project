export type View = 'inbox' | 'customer' | 'knowledge' | 'analytics'

export interface Conversation {
  id: number
  customer: string
  initials: string
  subject: string
  orderNumber: string
  preview: string
  time: string
  priority: 'High' | 'Normal'
  unread: boolean
}

export interface AgentThreadMessage {
  from: 'customer' | 'agent' | 'system' | 'note'
  text: string
  time: string
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
  sourceScores?: SourceScore[]
  retrievalMethod?: 'semantic' | 'keyword' | 'none'
  generationProvider?: 'mastra-gemini' | 'local-knowledge'
}

export interface SourceScore {
  title: string
  score: number
  semanticScore?: number
  feedbackAdjustment?: number
  feedbackCount?: number
  averageQuality?: number
}

export interface AnalyticsSummary {
  conversations: number
  averageRating: number
  averageQuality: number
  acceptanceRate: number
  correctionRate: number
  feedbackRecords: number
  topics: TopicData[]
  learningSignals: LearningSignals
  strongestSources: LearningSource[]
  reviewSources: LearningSource[]
}

export interface LearningSignals {
  learnedSourceCount: number
  trackedSourceCount: number
  agentActionCount: number
  averageSourceQuality: number
}

export interface LearningSource {
  title: string
  feedbackCount: number
  averageQuality: number
  averageRating: number
  acceptedCount: number
  editedCount: number
  rejectedCount: number
  feedbackAdjustment: number
}

export interface SystemStatus {
  generatedAt: string
  backend: {
    service: string
    status: string
    apiBase: string
  }
  database: {
    engine: string
    status: string
    conversations: number
    feedbackRecords: number
    knowledgeRecords: number
    indexedKnowledgeRecords: number
  }
  retrieval: {
    primary: string
    fallback: string
    embeddingModel: string
    storedEmbeddings: number
    dimensions: number
  }
  ai: {
    agentProvider: string
    mastraReady: boolean
    mastraServerEnabled: boolean
    model: string
    llmProvider: string
    providerConfigured: boolean
  }
  learning: {
    trackedSources: number
    learnedSources: number
  }
}

