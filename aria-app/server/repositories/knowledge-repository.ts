export type KnowledgeDocument = {
  id: number
  title: string
  category: string
  content: string
  status: string
  uses: number
  updatedAt: string
  archivedAt?: string | null
}

export type KnowledgeDocumentInput = {
  title: string
  category: string
  content: string
  status?: string
  sourceFilename?: string
}

export type KnowledgeDocumentVersion = {
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

export interface KnowledgeRepository {
  listKnowledge(): KnowledgeDocument[]
  listArchivedKnowledge(): KnowledgeDocument[]
  createKnowledgeDocument(input: KnowledgeDocumentInput): KnowledgeDocument
  updateKnowledgeDocument(id: number, input: KnowledgeDocumentInput): KnowledgeDocument | null
  archiveKnowledgeDocuments(ids: number[]): { archived: number | bigint }
  restoreKnowledgeDocuments(ids: number[]): { restored: number | bigint }
  deleteKnowledgeDocuments(ids: number[]): { deleted: number | bigint }
  getKnowledgeDocumentVersions(id: number): KnowledgeDocumentVersion[]
}
