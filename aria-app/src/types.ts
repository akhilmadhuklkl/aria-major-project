export type View = 'inbox' | 'customer' | 'knowledge' | 'analytics'

export type UserRole = 'admin' | 'support_agent' | 'customer'

export interface AuthUser {
  id: number
  email: string
  displayName: string
  role: UserRole
}

export interface Notification {
  id: number
  kind: string
  title: string
  message: string
  readAt: string | null
  createdAt: string
}

export interface AuditLog {
  id: number
  actorUserId?: number | null
  actorEmail?: string | null
  action: string
  entityType: string
  entityId?: string | null
  metadata: Record<string, unknown>
  createdAt: string
}

export interface WebhookSubscription {
  id: number
  name: string
  url: string
  events: string[]
  active: boolean
  createdAt: string
  updatedAt?: string
  secret?: string
}

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
  status?: 'Open' | 'Pending' | 'Resolved'
  assignedTo?: string
  tags?: string[]
  escalated?: boolean
}

export interface ConversationQueueCounts {
  mine: number
  unassigned: number
  attention: number
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

export interface KnowledgeVersion {
  id: number
  knowledgeDocumentId: number
  version: number
  title: string
  category: string
  content: string
  sourceFilename: string | null
  createdAt: string
  archivedAt: string | null
}

export interface GraphNode {
  id: string
  type: string
  properties: Record<string, string | number | boolean | null>
  createdAt: string
  updatedAt: string
}

export interface GraphRelationship {
  sourceId: string
  targetId: string
  type: string
  properties: Record<string, string | number | boolean | null>
  createdAt?: string
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
  retrievalMethod?: 'hybrid' | 'semantic' | 'keyword' | 'none'
  generationProvider?: 'mastra-gemini' | 'local-knowledge'
  latencyMs?: number
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
  range?: string
  generatedAt?: string
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
  retrieval?: Array<{ method: string; count: number }>
  escalations?: number
  escalationRate?: number
  assistantResponses?: number
  averageLatencyMs?: number
  averageConfidence?: number
  qualityTrend?: QualityTrendData[]
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
  graphStore: 'sqlite' | 'neo4j'
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
    semanticThreshold?: number
    hybridThreshold?: number
    confidenceThreshold?: number
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

