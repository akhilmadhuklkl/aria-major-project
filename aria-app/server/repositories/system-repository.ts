export interface SystemRepository {
  verifyConnection(): void | Promise<void>
  getRecordCounts(): { conversations: number; feedbackRecords: number }
}
