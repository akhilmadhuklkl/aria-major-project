export type FeedbackRecord = {
  id: string
  messageId: string
  conversationId: number
  rating?: number | null
  feedbackType: string
  comment?: string | null
  editedResponse?: string | null
  qualityScore: number
  createdAt: string
}

export interface FeedbackRepository {
  insertFeedback(entry: FeedbackRecord): void
}
