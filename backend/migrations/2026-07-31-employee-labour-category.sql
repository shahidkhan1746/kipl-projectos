-- ============================================================================
-- Migration: Employee labour category (Site Diary ↔ Timesheets reconciliation)
-- Date:      2026-07-31
-- Run in:    Supabase → SQL Editor, before the backend deploy. Safe to re-run.
-- ============================================================================
-- Buckets a site employee as skilled / unskilled / supervisory so the day's
-- "present" timesheets can be totalled by category and reconciled with the
-- Site Diary labour headcount. NULL = office / non-site staff (not counted).
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS labour_category varchar;
