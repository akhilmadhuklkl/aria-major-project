ALTER TABLE knowledge_documents ADD COLUMN archived_at TEXT;

CREATE TABLE IF NOT EXISTS knowledge_document_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  knowledge_document_id INTEGER NOT NULL,
  version INTEGER NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  content TEXT NOT NULL,
  source_filename TEXT,
  created_at TEXT NOT NULL,
  archived_at TEXT,
  UNIQUE (knowledge_document_id, version),
  FOREIGN KEY (knowledge_document_id) REFERENCES knowledge_documents(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_knowledge_versions_document
  ON knowledge_document_versions(knowledge_document_id, version DESC);
