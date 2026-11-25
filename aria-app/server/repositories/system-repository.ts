export interface SystemRepository {
  verifyConnection(): void | Promise<void>
  getRecordCounts(): { conversations: number; feedbackRecords: number }
}

export interface AsyncSystemRepository {
  verifyConnection(): Promise<void>
  getRecordCounts(): Promise<{ conversations: number; feedbackRecords: number }>
}
