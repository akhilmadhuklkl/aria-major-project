CREATE TABLE IF NOT EXISTS webhook_delivery_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  webhook_id INTEGER NOT NULL,
  event TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('delivered', 'failed')),
  response_status INTEGER,
  attempts INTEGER NOT NULL,
  error TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (webhook_id) REFERENCES webhook_subscriptions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_webhook_delivery_logs_webhook_created
  ON webhook_delivery_logs(webhook_id, created_at DESC);
