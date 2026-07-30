-- ============================================================================
-- Migration: Ensure site_diaries table matches the entity (idempotent)
-- Date:      2026-07-30
-- Why:       Diary "records nothing" in production — most likely the table or
--            some columns were never migrated (prod runs synchronize:false).
-- Run in:    Supabase → SQL Editor. Safe to re-run.
-- ============================================================================

-- Enum types (create only if missing) ---------------------------------------
DO $$ BEGIN
  CREATE TYPE site_diaries_weather_morning_enum AS ENUM
    ('sunny','cloudy','rainy','foggy','snowy','stormy');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE site_diaries_weather_afternoon_enum AS ENUM
    ('sunny','cloudy','rainy','foggy','snowy','stormy');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE site_diaries_status_enum AS ENUM ('draft','submitted','approved');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Table (create if missing) --------------------------------------------------
CREATE TABLE IF NOT EXISTS site_diaries (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  project_id  uuid NOT NULL,
  date        date NOT NULL,
  submitted_by varchar NOT NULL
);

-- Columns (add any that are missing) ----------------------------------------
ALTER TABLE site_diaries
  ADD COLUMN IF NOT EXISTS weather_morning    site_diaries_weather_morning_enum   NOT NULL DEFAULT 'sunny',
  ADD COLUMN IF NOT EXISTS weather_afternoon  site_diaries_weather_afternoon_enum NOT NULL DEFAULT 'sunny',
  ADD COLUMN IF NOT EXISTS temp_min           numeric(5,1),
  ADD COLUMN IF NOT EXISTS temp_max           numeric(5,1),
  ADD COLUMN IF NOT EXISTS rainfall_mm        numeric(6,1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS work_stopped_weather boolean    NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hours_lost         numeric(4,1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS labour_skilled     integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS labour_unskilled   integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS labour_supervisory integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS labour_total       integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS equipment          jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS work_done          jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS materials_received jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS visitors           jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS issues_faced       text,
  ADD COLUMN IF NOT EXISTS instructions_given text,
  ADD COLUMN IF NOT EXISTS next_day_plan      text,
  ADD COLUMN IF NOT EXISTS eot_claim          boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS eot_reason         text,
  ADD COLUMN IF NOT EXISTS status             site_diaries_status_enum NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS approved_by        varchar;

-- One entry per project per day (matches the service's manual guard) ---------
CREATE UNIQUE INDEX IF NOT EXISTS uq_site_diaries_project_date
  ON site_diaries (project_id, date);
