-- Migration: 2026-09-24-qa-cube-tests-pour-record.sql
-- Description: Columns for the pour-record and break-date fields the cube form
--              already collects but had nowhere to store.
--
-- The "Log Concrete Cube Set" form asks for cement brand, water-cement ratio,
-- slump, cube count and mix type, and the crushing dialog asks for the date the
-- cube was actually broken and who broke it. None of those had a column, so
-- every one was discarded on save. A cube register without w/c ratio and slump
-- is not an IS 456 pour record.
--
-- Note the two date columns are the ACTUAL break dates. test_7d_date and
-- test_28d_date are cast_date + 7 and + 28 — when the break is DUE.

ALTER TABLE qa_cube_tests ADD COLUMN IF NOT EXISTS cement_brand VARCHAR(64);
ALTER TABLE qa_cube_tests ADD COLUMN IF NOT EXISTS water_cement_ratio NUMERIC(4, 2);
ALTER TABLE qa_cube_tests ADD COLUMN IF NOT EXISTS slump_mm NUMERIC(6, 2);
ALTER TABLE qa_cube_tests ADD COLUMN IF NOT EXISTS cube_count INTEGER DEFAULT 6;
ALTER TABLE qa_cube_tests ADD COLUMN IF NOT EXISTS mix_type VARCHAR(32) DEFAULT 'design';
ALTER TABLE qa_cube_tests ADD COLUMN IF NOT EXISTS break_7d_date DATE;
ALTER TABLE qa_cube_tests ADD COLUMN IF NOT EXISTS break_28d_date DATE;

-- Overdue breaks are the query this register exists to answer, and both
-- columns are read together with the status on every list.
CREATE INDEX IF NOT EXISTS idx_qa_cube_tests_due
  ON qa_cube_tests (project_id, overall_status, test_7d_date, test_28d_date);
