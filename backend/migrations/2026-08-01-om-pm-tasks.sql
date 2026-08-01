-- ============================================================================
-- Migration: O&M preventive-maintenance schedule table
-- Date:      2026-08-01
-- Run in:    Supabase → SQL Editor, BEFORE the backend deploy. Safe to re-run.
-- ============================================================================
CREATE TABLE IF NOT EXISTS om_pm_tasks (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  project_id     uuid NOT NULL,
  equipment      varchar NOT NULL,
  task           text NOT NULL,
  frequency_days integer NOT NULL DEFAULT 30,
  last_done      date,
  responsible    varchar,
  remarks        text,
  active         boolean NOT NULL DEFAULT true
);
CREATE INDEX IF NOT EXISTS idx_om_pm_project ON om_pm_tasks (project_id);
