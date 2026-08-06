-- AI provider config (single row). Run in Supabase → SQL Editor before deploy.
CREATE TABLE IF NOT EXISTS ai_config (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  enabled    boolean NOT NULL DEFAULT false,
  provider   varchar NOT NULL DEFAULT 'gemini',
  api_key    text,
  model      varchar,
  base_url   varchar
);
