-- AI key pool for failover. Run in Supabase → SQL Editor BEFORE the backend deploys.
CREATE TABLE IF NOT EXISTS ai_keys (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  label      varchar NOT NULL DEFAULT '',
  provider   varchar NOT NULL DEFAULT 'nvidia',
  api_key    text,
  model      varchar,
  base_url   varchar,
  enabled    boolean NOT NULL DEFAULT true,
  priority   int NOT NULL DEFAULT 100
);

-- Migrate the existing single key from ai_config into the pool (once).
INSERT INTO ai_keys (label, provider, api_key, model, base_url, enabled, priority)
SELECT
  CASE WHEN provider = 'gemini' THEN 'Gemini' ELSE 'OpenAI-compatible' END,
  provider, api_key, model, base_url, true, 100
FROM ai_config
WHERE api_key IS NOT NULL AND api_key <> ''
  AND NOT EXISTS (SELECT 1 FROM ai_keys);
