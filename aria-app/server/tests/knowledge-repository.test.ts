import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import test from 'node:test'
import { createSqliteKnowledgeRepository } from '../repositories/sqlite-knowledge-repository.js'

function fixture() {
  const db = new DatabaseSync(':memory:')
  db.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE knowledge_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL, content TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'indexed',
      uses INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL
    );
    CREATE TABLE knowledge_embeddings (
      knowledge_document_id INTEGER PRIMARY KEY REFERENCES knowledge_documents(id) ON DELETE CASCADE,
      model TEXT NOT NULL, dimensions INTEGER NOT NULL, vector TEXT NOT NULL,
      content_hash TEXT NOT NULL, updated_at TEXT NOT NULL
    );
  `)
  db.exec(readFileSync('server/migrations/002_knowledge_document_lifecycle.sql', 'utf8'))
  return { db, repository: createSqliteKnowledgeRepository(db) }
}

test('knowledge repository preserves versions, invalidates embeddings, and handles archive/restore', () => {
  const { db, repository } = fixture()
  try {
    const input = { title: 'Refund policy', category: 'Policy', content: 'Original policy', sourceFilename: 'policy.txt' }
    const document = repository.createKnowledgeDocument(input)
    assert.equal(document.status, 'indexed')
    assert.equal(document.uses, 0)
    assert.equal(document.archivedAt, null)
    const initial = repository.getKnowledgeDocumentVersions(document.id)
    assert.equal(initial[0].version, 1)
    assert.equal(initial[0].sourceFilename, 'policy.txt')
    db.prepare("INSERT INTO knowledge_embeddings VALUES (?, 'test-model', 2, '[1,0]', 'hash', ?)").run(document.id, document.updatedAt)
    const updated = repository.updateKnowledgeDocument(document.id, { ...input, content: 'Revised policy', status: 'review' })
    assert.equal(updated?.content, 'Revised policy')
    assert.equal(updated?.status, 'review')
    assert.deepEqual(repository.getKnowledgeDocumentVersions(document.id).map((item) => item.version), [2, 1])
    assert.equal(repository.getKnowledgeDocumentVersions(document.id)[1].content, 'Original policy')
    assert.equal(db.prepare('SELECT * FROM knowledge_embeddings').all().length, 0)
    assert.equal(Number(repository.archiveKnowledgeDocuments([document.id, document.id, -1]).archived), 1)
    assert.equal(repository.listKnowledge().length, 0)
    assert.ok(repository.listArchivedKnowledge()[0].archivedAt)
    assert.equal(repository.updateKnowledgeDocument(document.id, input), null)
    assert.equal(Number(repository.archiveKnowledgeDocuments([document.id]).archived), 0)
    assert.equal(Number(repository.restoreKnowledgeDocuments([document.id]).restored), 1)
    assert.equal(repository.listArchivedKnowledge().length, 0)
    assert.equal(repository.listKnowledge()[0].id, document.id)
    assert.equal(Number(repository.restoreKnowledgeDocuments([document.id]).restored), 0)
    db.prepare("INSERT INTO knowledge_embeddings VALUES (?, 'test-model', 2, '[1,0]', 'hash', ?)").run(document.id, document.updatedAt)
    assert.equal(Number(repository.deleteKnowledgeDocuments([document.id, document.id]).deleted), 1)
    assert.equal(repository.getKnowledgeDocumentVersions(document.id).length, 0)
    assert.equal(db.prepare('SELECT * FROM knowledge_embeddings').all().length, 0)
  } finally {
    db.close()
  }
})

test('knowledge repository handles empty selections, missing documents, and duplicate titles', () => {
  const { db, repository } = fixture()
  try {
    const input = { title: 'Unique policy', category: 'Policy', content: 'Policy' }
    repository.createKnowledgeDocument(input)
    assert.throws(() => repository.createKnowledgeDocument(input), /UNIQUE/)
    assert.equal(repository.listKnowledge().length, 1)
    assert.equal(repository.updateKnowledgeDocument(999, input), null)
    assert.deepEqual(repository.getKnowledgeDocumentVersions(999), [])
    assert.equal(Number(repository.archiveKnowledgeDocuments([0, -1, 1.5, NaN]).archived), 0)
    assert.equal(Number(repository.restoreKnowledgeDocuments([]).restored), 0)
    assert.equal(Number(repository.deleteKnowledgeDocuments([999]).deleted), 0)
  } finally {
    db.close()
  }
})

test('embedding repository round-trips vectors, upserts hashes, and reports stored dimensions', () => {
  const { db, repository } = fixture()
  try {
    assert.deepEqual({ ...repository.getKnowledgeEmbeddingStats() }, { count: 0, minimumDimensions: 0, maximumDimensions: 0, modelCount: 0 })
    const document = repository.createKnowledgeDocument({ title: 'Embedded policy', category: 'Policy', content: 'Verified answer' })
    assert.equal(repository.listKnowledgeEmbeddingCandidates()[0].contentHash, null)
    assert.deepEqual(repository.listEmbeddedKnowledge(), [])
    repository.upsertKnowledgeEmbedding({ knowledgeDocumentId: document.id, model: 'test-model', vector: [0.25, -0.5], contentHash: 'initial' })
    const embedded = repository.listEmbeddedKnowledge()[0]
    assert.equal(embedded.id, document.id)
    assert.equal(embedded.content, 'Verified answer')
    assert.deepEqual(embedded.vector, [0.25, -0.5])
    assert.equal(embedded.dimensions, 2)
    assert.equal(repository.listKnowledgeEmbeddingCandidates()[0].contentHash, 'initial')
    repository.upsertKnowledgeEmbedding({ knowledgeDocumentId: document.id, model: 'replacement-model', vector: [1, 0, 0], contentHash: 'replacement' })
    assert.equal(repository.listEmbeddedKnowledge().length, 1)
    assert.deepEqual(repository.listEmbeddedKnowledge()[0].vector, [1, 0, 0])
    assert.equal(repository.listEmbeddedKnowledge()[0].model, 'replacement-model')
    assert.equal(repository.listKnowledgeEmbeddingCandidates()[0].contentHash, 'replacement')
    assert.deepEqual({ ...repository.getKnowledgeEmbeddingStats() }, { count: 1, minimumDimensions: 3, maximumDimensions: 3, modelCount: 1 })
  } finally {
    db.close()
  }
})

test('archived and review documents cannot enter semantic retrieval or indexing candidates', () => {
  const { db, repository } = fixture()
  try {
    const active = repository.createKnowledgeDocument({ title: 'Active policy', category: 'Policy', content: 'Active answer' })
    const archived = repository.createKnowledgeDocument({ title: 'Archived policy', category: 'Policy', content: 'Archived answer' })
    const review = repository.createKnowledgeDocument({ title: 'Review policy', category: 'Policy', content: 'Unverified answer', status: 'review' })
    for (const document of [active, archived, review]) {
      repository.upsertKnowledgeEmbedding({ knowledgeDocumentId: document.id, model: 'test-model', vector: [1, 0], contentHash: 'hash' })
    }
    repository.archiveKnowledgeDocuments([archived.id])
    assert.deepEqual(repository.listKnowledgeEmbeddingCandidates().map((item) => item.id), [active.id])
    assert.deepEqual(repository.listEmbeddedKnowledge().map((item) => item.id), [active.id])
    // Archiving retains the vector for restoration, but never makes it eligible for retrieval.
    assert.equal(repository.getKnowledgeEmbeddingStats().count, 3)
    repository.restoreKnowledgeDocuments([archived.id])
    assert.deepEqual(repository.listEmbeddedKnowledge().map((item) => item.id), [active.id, archived.id])
    assert.deepEqual(repository.listKnowledgeEmbeddingCandidates().map((item) => item.id), [active.id, archived.id])
    repository.updateKnowledgeDocument(active.id, { title: active.title, category: active.category, content: 'Changed answer' })
    assert.equal(repository.listKnowledgeEmbeddingCandidates().find((item) => item.id === active.id)?.contentHash, null)
    assert.deepEqual(repository.listEmbeddedKnowledge().map((item) => item.id), [archived.id])
  } finally {
    db.close()
  }
})

test('knowledge feedback attribution and usage counters retain existing semantics', () => {
  const { db, repository } = fixture()
  try {
    db.exec(`
      CREATE TABLE messages (id TEXT PRIMARY KEY, sources TEXT);
      CREATE TABLE feedback (message_id TEXT, rating INTEGER, feedback_type TEXT, quality_score REAL);
    `)
    const create = (title: string) => repository.createKnowledgeDocument({ title, category: 'Policy', content: title })
    const first = create('First policy')
    const second = create('Second policy')
    const archived = create('Archived policy')
    repository.archiveKnowledgeDocuments([archived.id])
    const add = (sources: string, type: string, quality: number, rating: number | null = null) => {
      const id = crypto.randomUUID()
      db.prepare('INSERT INTO messages VALUES (?, ?)').run(id, sources)
      db.prepare('INSERT INTO feedback VALUES (?, ?, ?, ?)').run(id, rating, type, quality)
    }
    add(JSON.stringify(['Unknown', first.title, second.title]), 'accepted', 100)
    add(JSON.stringify([first.title, second.title]), 'customer_rating', 80, 4)
    add(JSON.stringify([first.title]), 'edited', 60)
    add(JSON.stringify([first.title]), 'rejected', 40)
    add(JSON.stringify([second.title]), 'accepted', 90)
    add(JSON.stringify([archived.title]), 'customer_rating', 0, 1)
    add('not-json', 'customer_rating', 0, 1)
    add('{}', 'customer_rating', 0, 1)
    add('[]', 'customer_rating', 0, 1)
    const stats = repository.getKnowledgeSourceFeedbackStats()
    const { getKnowledgeSourceFeedbackStats } = repository
    assert.deepEqual(getKnowledgeSourceFeedbackStats(), stats)
    assert.equal(stats.length, 2)
    assert.deepEqual(stats.find((item) => item.title === first.title), {
      title: first.title, feedbackCount: 4, averageQuality: 70, averageRating: 4,
      acceptedCount: 1, editedCount: 1, rejectedCount: 1,
    })
    assert.deepEqual(stats.find((item) => item.title === second.title), {
      title: second.title, feedbackCount: 1, averageQuality: 90, averageRating: 0,
      acceptedCount: 1, editedCount: 0, rejectedCount: 0,
    })
    repository.incrementKnowledgeUses(first.title)
    repository.incrementKnowledgeUses(first.title)
    repository.incrementKnowledgeUses(second.title)
    repository.incrementKnowledgeUses('Missing policy')
    assert.deepEqual(repository.listKnowledge().map((item) => [item.title, item.uses]), [[first.title, 2], [second.title, 1]])
  } finally {
    db.close()
  }
})
