CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'support_agent', 'customer')),
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS conversations (
  id BIGSERIAL PRIMARY KEY,
  customer_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'normal',
  topic TEXT NOT NULL DEFAULT 'General',
  assigned_to TEXT,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  escalated BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id BIGINT NOT NULL REFERENCES conversations(id),
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  confidence DOUBLE PRECISION,
  sources JSONB,
  source_scores JSONB,
  retrieval_method TEXT,
  generation_provider TEXT,
  should_escalate BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL REFERENCES messages(id),
  conversation_id BIGINT NOT NULL REFERENCES conversations(id),
  rating INTEGER,
  feedback_type TEXT NOT NULL DEFAULT 'customer_rating',
  comment TEXT,
  edited_response TEXT,
  quality_score DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS knowledge_documents (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'indexed',
  uses INTEGER NOT NULL DEFAULT 0,
  archived_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS knowledge_document_versions (
  id BIGSERIAL PRIMARY KEY,
  knowledge_document_id BIGINT NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  content TEXT NOT NULL,
  source_filename TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  archived_at TIMESTAMPTZ,
  UNIQUE (knowledge_document_id, version)
);

CREATE TABLE IF NOT EXISTS knowledge_embeddings (
  knowledge_document_id BIGINT PRIMARY KEY REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  model TEXT NOT NULL,
  dimensions INTEGER NOT NULL,
  vector JSONB NOT NULL,
  content_hash TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS webhook_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  secret TEXT NOT NULL,
  events JSONB NOT NULL DEFAULT '["*"]'::jsonb,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS graph_nodes (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS graph_relationships (
  id BIGSERIAL PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES graph_nodes(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  target_id TEXT NOT NULL REFERENCES graph_nodes(id) ON DELETE CASCADE,
  properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL,
  UNIQUE (source_id, type, target_id)
);

CREATE INDEX IF NOT EXISTS idx_pg_conversations_status_updated ON conversations(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_pg_messages_conversation_created ON messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_pg_feedback_conversation_created ON feedback(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pg_feedback_message ON feedback(message_id);
CREATE INDEX IF NOT EXISTS idx_pg_knowledge_status_category ON knowledge_documents(status, category);
CREATE INDEX IF NOT EXISTS idx_pg_sessions_expiry ON sessions(expires_at, revoked_at);
CREATE INDEX IF NOT EXISTS idx_pg_conversations_assigned_status ON conversations(assigned_to, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_pg_knowledge_versions_document ON knowledge_document_versions(knowledge_document_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_pg_notifications_read_created ON notifications(read_at, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pg_webhook_subscriptions_active ON webhook_subscriptions(active);
CREATE INDEX IF NOT EXISTS idx_pg_graph_relationships_source ON graph_relationships(source_id, type);
CREATE INDEX IF NOT EXISTS idx_pg_graph_relationships_target ON graph_relationships(target_id, type);
