CREATE INDEX IF NOT EXISTS idx_conversations_status_updated
  ON conversations(status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
  ON messages(conversation_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_feedback_conversation_created
  ON feedback(conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_feedback_message
  ON feedback(message_id);

CREATE INDEX IF NOT EXISTS idx_knowledge_status_category
  ON knowledge_documents(status, category);

