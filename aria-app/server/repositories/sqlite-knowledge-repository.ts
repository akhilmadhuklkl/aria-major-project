import type { DatabaseSync } from 'node:sqlite'
import type { EmbeddedKnowledgeDocument, KnowledgeDocument, KnowledgeDocumentVersion, KnowledgeEmbeddingStats, KnowledgeRepository } from './knowledge-repository.js'

const documentColumns = 'id, title, category, content, status, uses, updated_at AS updatedAt, archived_at AS archivedAt'
const validIds = (ids: number[]) => [...new Set(ids.filter((id) => Number.isInteger(id) && id > 0))]

export function createSqliteKnowledgeRepository(db: DatabaseSync): KnowledgeRepository {
  const getDocument = (id: number) => db.prepare(`SELECT ${documentColumns} FROM knowledge_documents WHERE id = ?`).get(id) as KnowledgeDocument
  return {
    listKnowledgeEmbeddingCandidates() {
      return db.prepare(`
        SELECT documents.id, documents.title, documents.category, documents.content, documents.status,
          documents.uses, documents.updated_at AS updatedAt, documents.archived_at AS archivedAt,
          embeddings.content_hash AS contentHash
        FROM knowledge_documents AS documents
        LEFT JOIN knowledge_embeddings AS embeddings ON embeddings.knowledge_document_id = documents.id
        WHERE documents.status = 'indexed' AND documents.archived_at IS NULL
        ORDER BY documents.id
      `).all() as Array<KnowledgeDocument & { contentHash: string | null }>
    },
    upsertKnowledgeEmbedding(input) {
      db.prepare(`
        INSERT INTO knowledge_embeddings (knowledge_document_id, model, dimensions, vector, content_hash, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(knowledge_document_id) DO UPDATE SET
          model = excluded.model, dimensions = excluded.dimensions, vector = excluded.vector,
          content_hash = excluded.content_hash, updated_at = excluded.updated_at
      `).run(input.knowledgeDocumentId, input.model, input.vector.length, JSON.stringify(input.vector), input.contentHash, new Date().toISOString())
    },
    getKnowledgeEmbeddingStats() {
      return db.prepare(`
        SELECT COUNT(*) AS count, COALESCE(MIN(dimensions), 0) AS minimumDimensions,
          COALESCE(MAX(dimensions), 0) AS maximumDimensions, COUNT(DISTINCT model) AS modelCount
        FROM knowledge_embeddings
      `).get() as KnowledgeEmbeddingStats
    },
    listEmbeddedKnowledge() {
      const rows = db.prepare(`
        SELECT documents.id, documents.title, documents.category, documents.content, documents.status,
          documents.uses, documents.updated_at AS updatedAt, documents.archived_at AS archivedAt,
          embeddings.model, embeddings.dimensions, embeddings.vector
        FROM knowledge_embeddings AS embeddings
        JOIN knowledge_documents AS documents ON documents.id = embeddings.knowledge_document_id
        WHERE documents.status = 'indexed' AND documents.archived_at IS NULL
        ORDER BY documents.id
      `).all() as Array<Omit<EmbeddedKnowledgeDocument, 'vector'> & { vector: string }>
      return rows.map((row) => ({ ...row, vector: JSON.parse(row.vector) as number[] }))
    },
    listKnowledge() {
      return db.prepare(`SELECT ${documentColumns} FROM knowledge_documents WHERE archived_at IS NULL ORDER BY uses DESC, updated_at DESC`).all() as KnowledgeDocument[]
    },
    listArchivedKnowledge() {
      return db.prepare(`SELECT ${documentColumns} FROM knowledge_documents WHERE archived_at IS NOT NULL ORDER BY archived_at DESC`).all() as KnowledgeDocument[]
    },
    createKnowledgeDocument(input) {
      const now = new Date().toISOString()
      const created = db.prepare(`
        INSERT INTO knowledge_documents (title, category, content, status, uses, updated_at, archived_at)
        VALUES (?, ?, ?, ?, 0, ?, NULL)
      `).run(input.title, input.category, input.content, input.status ?? 'indexed', now)
      const id = Number(created.lastInsertRowid)
      db.prepare(`
        INSERT INTO knowledge_document_versions (knowledge_document_id, version, title, category, content, source_filename, created_at)
        VALUES (?, 1, ?, ?, ?, ?, ?)
      `).run(id, input.title, input.category, input.content, input.sourceFilename ?? null, now)
      return getDocument(id)
    },
    updateKnowledgeDocument(id, input) {
      if (!db.prepare('SELECT id FROM knowledge_documents WHERE id = ? AND archived_at IS NULL').get(id)) return null
      const now = new Date().toISOString()
      const next = db.prepare('SELECT COALESCE(MAX(version), 0) + 1 AS version FROM knowledge_document_versions WHERE knowledge_document_id = ?').get(id) as { version: number }
      db.prepare('UPDATE knowledge_documents SET title = ?, category = ?, content = ?, status = ?, updated_at = ? WHERE id = ?')
        .run(input.title, input.category, input.content, input.status ?? 'indexed', now, id)
      db.prepare(`
        INSERT INTO knowledge_document_versions (knowledge_document_id, version, title, category, content, source_filename, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(id, next.version, input.title, input.category, input.content, input.sourceFilename ?? null, now)
      db.prepare('DELETE FROM knowledge_embeddings WHERE knowledge_document_id = ?').run(id)
      return getDocument(id)
    },
    archiveKnowledgeDocuments(ids) {
      const selected = validIds(ids)
      if (!selected.length) return { archived: 0 }
      return { archived: db.prepare(`UPDATE knowledge_documents SET archived_at = ?, updated_at = ? WHERE id IN (${selected.map(() => '?').join(', ')}) AND archived_at IS NULL`)
        .run(new Date().toISOString(), new Date().toISOString(), ...selected).changes }
    },
    restoreKnowledgeDocuments(ids) {
      const selected = validIds(ids)
      if (!selected.length) return { restored: 0 }
      return { restored: db.prepare(`UPDATE knowledge_documents SET archived_at = NULL, updated_at = ? WHERE id IN (${selected.map(() => '?').join(', ')}) AND archived_at IS NOT NULL`)
        .run(new Date().toISOString(), ...selected).changes }
    },
    deleteKnowledgeDocuments(ids) {
      const selected = validIds(ids)
      if (!selected.length) return { deleted: 0 }
      return { deleted: db.prepare(`DELETE FROM knowledge_documents WHERE id IN (${selected.map(() => '?').join(', ')})`).run(...selected).changes }
    },
    getKnowledgeDocumentVersions(id) {
      return db.prepare(`
        SELECT id, knowledge_document_id AS knowledgeDocumentId, version, title, category,
          content, source_filename AS sourceFilename, created_at AS createdAt, archived_at AS archivedAt
        FROM knowledge_document_versions WHERE knowledge_document_id = ? ORDER BY version DESC
      `).all(id) as KnowledgeDocumentVersion[]
    },
  }
}
