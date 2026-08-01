-- ============================================================================
-- Migration: Site-diary photos + Cement/Steel register + Site Order Book
-- Date:      2026-08-02
-- Run in:    Supabase → SQL Editor, BEFORE the backend deploy. Safe to re-run.
-- ============================================================================

-- 1) Site Diary photographs (Clause 17.5 / 23.3) ----------------------------
ALTER TABLE site_diaries
  ADD COLUMN IF NOT EXISTS photos jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 2) Cement & Steel register (Clause 55) ------------------------------------
CREATE TABLE IF NOT EXISTS material_register (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  project_id    uuid NOT NULL,
  date          date NOT NULL,
  material      varchar NOT NULL,
  unit          varchar,
  received_qty  numeric(12,3) NOT NULL DEFAULT 0,
  consumed_qty  numeric(12,3) NOT NULL DEFAULT 0,
  contractor_rep varchar,
  ueed_rep      varchar,
  remarks       text
);
CREATE INDEX IF NOT EXISTS idx_material_register_project ON material_register (project_id, material, date);

-- 3) Site Order Book (Clause 42.3) ------------------------------------------
CREATE TABLE IF NOT EXISTS site_orders (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  project_id        uuid NOT NULL,
  order_no          varchar,
  date              date NOT NULL,
  issued_by         varchar NOT NULL,
  instruction       text NOT NULL,
  acknowledged_by   varchar,
  acknowledged_date date,
  compliance_status varchar NOT NULL DEFAULT 'pending',
  remarks           text
);
CREATE INDEX IF NOT EXISTS idx_site_orders_project ON site_orders (project_id);
