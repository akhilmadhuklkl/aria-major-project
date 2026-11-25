type Count = { count: number }

export type AnalyticsMetrics = {
  conversationCount: Count
  feedbackStats: Count & { averageRating: number; averageQuality: number }
  accepted: Count
  corrected: Count
  rejected: Count
  topicRows: Array<{ topic: string; conversations: number }>
  retrievalRows: Array<{ method: string; count: number }>
  providerRows: Array<{ provider: string; count: number }>
  escalationCount: Count
  responseMessageCount: Count
  latencyStats: { averageLatencyMs: number }
  confidenceStats: { averageConfidence: number }
  groundedResponseCount: Count
  highConfidenceCount: Count
  lowConfidenceCount: Count
  qualityTrend: Array<{ day: string; quality: number; rating: number }>
}

export interface AnalyticsRepository {
  getAnalyticsMetrics(since: string | undefined, confidenceThreshold: number): AnalyticsMetrics
}
