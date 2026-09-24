-- System Error Logs for comprehensive troubleshooting
CREATE TABLE IF NOT EXISTS system_error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source VARCHAR(30) NOT NULL DEFAULT 'backend',
  level VARCHAR(20) NOT NULL DEFAULT 'error',
  error_name VARCHAR(150),
  message TEXT NOT NULL,
  stack TEXT,
  path VARCHAR(500),
  method VARCHAR(10),
  status_code INTEGER,
  user_id UUID,
  user_email VARCHAR(255),
  user_role VARCHAR(50),
  ip_address VARCHAR(100),
  user_agent TEXT,
  metadata JSONB,
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_error_logs_created_at ON system_error_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_error_logs_source ON system_error_logs (source);
CREATE INDEX IF NOT EXISTS idx_system_error_logs_status_code ON system_error_logs (status_code);
CREATE INDEX IF NOT EXISTS idx_system_error_logs_level ON system_error_logs (level);
