-- Migration: Add 'upcoming' status and seed Anantnag Sewerage & STP Scheme project
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
  'Anantnag Sewerage & STP Scheme',
  'ANG-STP-2026',
  'Comprehensive Sewerage Network & Sewage Treatment Plant (STP) Scheme for Anantnag Town, South Kashmir. Upcoming project in bidding/allotment phase.',
  'J&K UEED / Jal Shakti Department',
  'Anantnag, Kashmir, J&K',
  18500000000,
  'upcoming',
  0,
  NOW(),
  NOW()
) ON CONFLICT (code) DO UPDATE SET
  status = 'upcoming',
  location = 'Anantnag, Kashmir, J&K';
