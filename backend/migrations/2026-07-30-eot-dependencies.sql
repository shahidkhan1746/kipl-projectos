-- ============================================================================
-- Migration: Dependency network + Liaison delay/EOT tracking
-- Date:      2026-07-30
-- Run in:    Supabase → SQL Editor (production runs synchronize:false)
-- Order:     RUN THIS BEFORE deploying the new backend build.
-- ============================================================================

-- 1) Liaison: new "Vetting" file type on the Postgres enum -------------------
--    (TypeORM default enum name is <table>_<column>_enum. If yours differs,
--     find it with:  \dT+   or   SELECT typname FROM pg_type WHERE typname LIKE '%file_type%';)
ALTER TYPE liaison_files_file_type_enum ADD VALUE IF NOT EXISTS 'vetting';

-- 2) WBS: structured dependency network (type FS/SS/FF/SF + lag) -------------
ALTER TABLE wbs_tasks
  ADD COLUMN IF NOT EXISTS dependencies jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 3) Liaison: delay / EOT tracking columns -----------------------------------
ALTER TABLE liaison_files
  ADD COLUMN IF NOT EXISTS expected_date    date,
  ADD COLUMN IF NOT EXISTS actual_date      date,
  ADD COLUMN IF NOT EXISTS delay_days       integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_eot_ground    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS eot_reason       text,
  ADD COLUMN IF NOT EXISTS linked_wbs_code  varchar;
