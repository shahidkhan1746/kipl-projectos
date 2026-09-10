-- Migration: Add 'upcoming' status and seed Anantnag project
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'projects_status_enum') THEN
    ALTER TYPE projects_status_enum ADD VALUE IF NOT EXISTS 'upcoming';
  END IF;
END$$;

INSERT INTO projects (
  id,
  name,
  code,
  description,
  client,
  location,
  contract_value,
  status,
  progress_pct,
  created_at,
  updated_at
) VALUES (
  '2cab433d-0cb2-4739-8a27-de97f4a510a8',
  'Anantnag',
  'ANG',
  'Coming Soon',
  NULL,
  'Anantnag, Kashmir',
  NULL,
  'upcoming',
  0,
  NOW(),
  NOW()
) ON CONFLICT (code) DO UPDATE SET
  name = 'Anantnag',
  status = 'upcoming',
  location = 'Anantnag, Kashmir',
  description = 'Coming Soon',
  client = NULL,
  contract_value = NULL;

