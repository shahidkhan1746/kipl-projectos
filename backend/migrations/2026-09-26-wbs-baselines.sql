-- Migration: 2026-09-26-wbs-baselines.sql
-- Superseded. This file created a second wbs_baselines design (a header table
-- plus wbs_baseline_tasks) alongside the one in 2026-09-26-cpm-logic-first.sql.
-- Migrations re-run on every boot, so leaving its CREATE statements here would
-- recreate the retired tables after 2026-09-29-wbs-baselines-unify.sql has
-- folded them into the one design. Kept as a file so the history reads true.
SELECT 1;
