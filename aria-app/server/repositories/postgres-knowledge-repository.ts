import type { Pool, PoolClient } from 'pg'
import type { AsyncKnowledgeRepository, EmbeddedKnowledgeDocument, KnowledgeDocument, KnowledgeDocumentInput, KnowledgeDocumentVersion, KnowledgeEmbeddingStats, KnowledgeSourceFeedbackStats } from './knowledge-repository.js'

type DocumentRow = Omit<KnowledgeDocument, 'id' | 'updatedAt' | 'archivedAt'> & {
  id: string | number
  updatedAt: Date | string
  archivedAt: Date | string | null
}
type VersionRow = Omit<KnowledgeDocumentVersion, 'id' | 'knowledgeDocumentId' | 'createdAt' | 'archivedAt'> & {
  id: string | number
  knowledgeDocumentId: string | number
  createdAt: Date | string
  archivedAt: Date | string | null
}
type WithCountStrings<T, Keys extends keyof T> = Omit<T, Keys> & Record<Keys, string | number>
type FeedbackRow = WithCountStrings<KnowledgeSourceFeedbackStats, 'feedbackCount' | 'acceptedCount' | 'editedCount' | 'rejectedCount'>
type StatsRow = WithCountStrings<KnowledgeEmbeddingStats, 'count' | 'modelCount'>

const columns = 'd.id, d.title, d.category, d.content, d.status, d.uses, d.updated_at AS "updatedAt", d.archived_at AS "archivedAt"'
const toIso = (value: Date | string) => new Date(value).toISOString()
const validIds = (ids: number[]) => [...new Set(ids.filter((id) => Number.isSafeInteger(id) && id > 0))]
const mapDocument = <Row extends DocumentRow>(row: Row) => ({
  ...row, id: Number(row.id), updatedAt: toIso(row.updatedAt), archivedAt: row.archivedAt === null ? null : toIso(row.archivedAt),
})

export function createPostgresKnowledgeRepository(pool: Pick<Pool, 'query' | 'connect'>): AsyncKnowledgeRepository {
  async function transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await pool.connect()
    let discardClient = false
    try {
      await client.query('BEGIN ISOLATION LEVEL READ COMMITTED')
      const result = await work(client)
      await client.query('COMMIT')
      return result
    } catch (error) {
      try {
        await client.query('ROLLBACK')
      } catch {
        discardClient = true
      }
      throw error
    } finally {
      client.release(discardClient)
    }
  }

  async function appendVersion(client: PoolClient, id: string | number, input: KnowledgeDocumentInput, now: string) {
    await client.query(`
      INSERT INTO knowledge_document_versions
        (knowledge_document_id, version, title, category, content, source_filename, created_at)
      SELECT $1, COALESCE(MAX(version), 0) + 1, $2, $3, $4, $5, $6
      FROM knowledge_document_versions WHERE knowledge_document_id = $1
    `, [id, input.title, input.category, input.content, input.sourceFilename ?? null, now])
  }

  return {
    async listKnowledge() {
      const result = await pool.query<DocumentRow>(`SELECT ${columns} FROM knowledge_documents AS d WHERE d.archived_at IS NULL ORDER BY d.uses DESC, d.updated_at DESC`)
      return result.rows.map(mapDocument)
    },
    async listArchivedKnowledge() {
      const result = await pool.query<DocumentRow>(`SELECT ${columns} FROM knowledge_documents AS d WHERE d.archived_at IS NOT NULL ORDER BY d.archived_at DESC`)
      return result.rows.map(mapDocument)
    },
    async createKnowledgeDocument(input) {
      return transaction(async (client) => {
        const now = new Date().toISOString()
        const { rows: [row] } = await client.query<DocumentRow>(`
          INSERT INTO knowledge_documents AS d (title, category, content, status, updated_at)
          VALUES ($1, $2, $3, $4, $5) RETURNING ${columns}
        `, [input.title, input.category, input.content, input.status ?? 'indexed', now])
        await appendVersion(client, row.id, input, now)
        return mapDocument(row)
      })
    },
    async createKnowledgeDocumentWithEmbedding(input, embedding) {
      return transaction(async (client) => {
        const now = new Date().toISOString()
        const { rows: [row] } = await client.query<DocumentRow>(`
          INSERT INTO knowledge_documents AS d (title, category, content, status, updated_at)
          VALUES ($1, $2, $3, $4, $5) RETURNING ${columns}
        `, [input.title, input.category, input.content, input.status ?? 'indexed', now])
        await appendVersion(client, row.id, input, now)
        await client.query(`
          INSERT INTO knowledge_embeddings (knowledge_document_id, model, dimensions, vector, content_hash, updated_at)
          VALUES ($1, $2, $3, $4::jsonb, $5, $6)
        `, [row.id, embedding.model, embedding.vector.length, JSON.stringify(embedding.vector), embedding.contentHash, now])
        return mapDocument(row)
      })
    },
    async updateKnowledgeDocument(id, input) {
      return transaction(async (client) => {
        const now = new Date().toISOString()
        // This update holds the document row lock until its new version is written.
        const { rows: [row] } = await client.query<DocumentRow>(`
          UPDATE knowledge_documents AS d SET title = $1, category = $2, content = $3, status = $4, updated_at = $5
          WHERE d.id = $6 AND d.archived_at IS NULL RETURNING ${columns}
        `, [input.title, input.category, input.content, input.status ?? 'indexed', now, id])
        if (!row) return null
        await appendVersion(client, row.id, input, now)
        await client.query('DELETE FROM knowledge_embeddings WHERE knowledge_document_id = $1', [row.id])
        return mapDocument(row)
      })
    },
    async archiveKnowledgeDocuments(ids) {
      const selected = validIds(ids)
      if (!selected.length) return { archived: 0 }
      const result = await pool.query('UPDATE knowledge_documents SET archived_at = $1, updated_at = $1 WHERE id = ANY($2::bigint[]) AND archived_at IS NULL', [new Date().toISOString(), selected])
      return { archived: result.rowCount ?? 0 }
    },
    async restoreKnowledgeDocuments(ids) {
      const selected = validIds(ids)
      if (!selected.length) return { restored: 0 }
      const result = await pool.query('UPDATE knowledge_documents SET archived_at = NULL, updated_at = $1 WHERE id = ANY($2::bigint[]) AND archived_at IS NOT NULL', [new Date().toISOString(), selected])
      return { restored: result.rowCount ?? 0 }
    },
    async deleteKnowledgeDocuments(ids) {
      const selected = validIds(ids)
      if (!selected.length) return { deleted: 0 }
      const result = await pool.query('DELETE FROM knowledge_documents WHERE id = ANY($1::bigint[])', [selected])
      return { deleted: result.rowCount ?? 0 }
    },
    async getKnowledgeDocumentVersions(id) {
      const result = await pool.query<VersionRow>(`
        SELECT id, knowledge_document_id AS "knowledgeDocumentId", version, title, category, content,
          source_filename AS "sourceFilename", created_at AS "createdAt", archived_at AS "archivedAt"
        FROM knowledge_document_versions WHERE knowledge_document_id = $1 ORDER BY version DESC
      `, [id])
      return result.rows.map((row) => ({
        ...row, id: Number(row.id), knowledgeDocumentId: Number(row.knowledgeDocumentId), createdAt: toIso(row.createdAt),
        archivedAt: row.archivedAt === null ? null : toIso(row.archivedAt),
      }))
    },
    async listKnowledgeEmbeddingCandidates() {
      const result = await pool.query<DocumentRow & { contentHash: string | null }>(`
        SELECT ${columns}, e.content_hash AS "contentHash"
        FROM knowledge_documents AS d LEFT JOIN knowledge_embeddings AS e ON e.knowledge_document_id = d.id
        WHERE d.status = 'indexed' AND d.archived_at IS NULL ORDER BY d.id
      `)
      return result.rows.map(mapDocument)
    },
    async upsertKnowledgeEmbedding(input) {
      await pool.query(`
        INSERT INTO knowledge_embeddings (knowledge_document_id, model, dimensions, vector, content_hash, updated_at)
        VALUES ($1, $2, $3, $4::jsonb, $5, $6)
        ON CONFLICT (knowledge_document_id) DO UPDATE SET model = excluded.model, dimensions = excluded.dimensions,
          vector = excluded.vector, content_hash = excluded.content_hash, updated_at = excluded.updated_at
      `, [input.knowledgeDocumentId, input.model, input.vector.length, JSON.stringify(input.vector), input.contentHash, new Date().toISOString()])
    },
    async getKnowledgeEmbeddingStats() {
      const { rows: [row] } = await pool.query<StatsRow>(`
        SELECT COUNT(*) AS count, COALESCE(MIN(dimensions), 0) AS "minimumDimensions",
          COALESCE(MAX(dimensions), 0) AS "maximumDimensions", COUNT(DISTINCT model) AS "modelCount"
        FROM knowledge_embeddings
      `)
      return { ...row, count: Number(row.count), modelCount: Number(row.modelCount) }
    },
    async listEmbeddedKnowledge() {
      const result = await pool.query<DocumentRow & Pick<EmbeddedKnowledgeDocument, 'model' | 'dimensions' | 'vector'>>(`
        SELECT ${columns}, e.model, e.dimensions, e.vector
        FROM knowledge_embeddings AS e JOIN knowledge_documents AS d ON d.id = e.knowledge_document_id
        WHERE d.status = 'indexed' AND d.archived_at IS NULL ORDER BY d.id
      `)
      return result.rows.map(mapDocument)
    },
    async incrementKnowledgeUses(title) {
      await pool.query('UPDATE knowledge_documents SET uses = uses + 1 WHERE title = $1', [title])
    },
    async getKnowledgeSourceFeedbackStats() {
      // Attribute each feedback row to its first recognized, non-archived source.
      const result = await pool.query<FeedbackRow>(`
        SELECT matched.title, COUNT(*) AS "feedbackCount", AVG(f.quality_score) AS "averageQuality",
          COALESCE(AVG(f.rating)::double precision, 0) AS "averageRating",
          COUNT(*) FILTER (WHERE f.feedback_type = 'accepted') AS "acceptedCount",
          COUNT(*) FILTER (WHERE f.feedback_type = 'edited') AS "editedCount",
          COUNT(*) FILTER (WHERE f.feedback_type = 'rejected') AS "rejectedCount"
        FROM feedback AS f JOIN messages AS m ON m.id = f.message_id
        CROSS JOIN LATERAL (
          SELECT d.title
          FROM jsonb_array_elements(CASE WHEN jsonb_typeof(m.sources) = 'array' THEN m.sources ELSE '[]'::jsonb END)
            WITH ORDINALITY AS source(value, position)
          JOIN knowledge_documents AS d ON d.title = (source.value #>> '{}') AND d.archived_at IS NULL
          WHERE jsonb_typeof(source.value) = 'string'
          ORDER BY source.position LIMIT 1
        ) AS matched
        GROUP BY matched.title
      `)
      return result.rows.map((row) => ({
        ...row, feedbackCount: Number(row.feedbackCount), acceptedCount: Number(row.acceptedCount),
        editedCount: Number(row.editedCount), rejectedCount: Number(row.rejectedCount),
      }))
    },
  }
}
