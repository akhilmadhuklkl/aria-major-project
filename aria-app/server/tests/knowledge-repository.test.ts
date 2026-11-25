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
