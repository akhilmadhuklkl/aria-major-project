ALTER TABLE conversations ADD COLUMN assigned_to TEXT;
ALTER TABLE conversations ADD COLUMN tags TEXT NOT NULL DEFAULT '[]';
ALTER TABLE conversations ADD COLUMN escalated INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_conversations_assigned_status
  ON conversations(assigned_to, status, updated_at DESC);
