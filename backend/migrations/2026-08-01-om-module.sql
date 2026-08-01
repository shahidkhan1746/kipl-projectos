-- ============================================================================
-- Migration: O&M module (process logs + breakdown/maintenance events)
-- Date:      2026-08-01
-- Run in:    Supabase → SQL Editor, BEFORE the backend deploy. Safe to re-run.
-- ============================================================================

-- Enums for om_events -------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE om_events_type_enum AS ENUM ('breakdown','preventive','corrective');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE om_events_status_enum AS ENUM ('open','closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Daily process / effluent log ----------------------------------------------
CREATE TABLE IF NOT EXISTS om_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  project_id  uuid NOT NULL,
  date        date NOT NULL,
  shift       varchar,
  inflow_mld  numeric(8,2),  outflow_mld numeric(8,2),
  in_bod      numeric(8,2),  in_cod      numeric(8,2),  in_tss numeric(8,2),
  out_bod     numeric(8,2),  out_cod     numeric(8,2),  out_tss numeric(8,2),
  out_ph      numeric(4,2),  out_do      numeric(6,2),
  out_fecal_coliform numeric(12,2),
  out_amm_n   numeric(8,2),  out_total_n numeric(8,2),  out_total_p numeric(8,2),
  mlss        numeric(10,2), svi         numeric(10,2),
  do_aeration numeric(6,2),  chlorine_residual numeric(6,2),
  power_kwh   numeric(12,2), dg_hours    numeric(6,2),  sludge_m3 numeric(10,2),
  operator    varchar,       remarks     text
);
CREATE INDEX IF NOT EXISTS idx_om_logs_project_date ON om_logs (project_id, date);

-- Breakdown / maintenance events --------------------------------------------
CREATE TABLE IF NOT EXISTS om_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  project_id  uuid NOT NULL,
  type        om_events_type_enum   NOT NULL DEFAULT 'breakdown',
  equipment   varchar NOT NULL,
  start_at    timestamptz NOT NULL,
  end_at      timestamptz,
  cause       text,
  action      text,
  status      om_events_status_enum NOT NULL DEFAULT 'open',
  attended_by varchar,
  remarks     text
);
CREATE INDEX IF NOT EXISTS idx_om_events_project ON om_events (project_id);
