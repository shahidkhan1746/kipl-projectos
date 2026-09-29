-- Migration: 2026-09-29-wbs-baselines-unify.sql
-- Description: One baseline design. Two had been merged: the frozen-programme
--              table from 2026-09-26-cpm-logic-first.sql (activities held as
--              JSON on the row) and, from 2026-09-26-wbs-baselines.sql, a header
--              table plus wbs_baseline_tasks. Where the second shape is found it
--              is converted in place — every baseline and every task row kept —
--              and the retired columns and table are dropped. Runs on every
--              boot: on a converted or fresh database only the first statement
--              has anything to do.

-- The accepted programme, used as the S-curve's planned line.
ALTER TABLE wbs_baselines ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT false;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema = 'public' AND table_name = 'wbs_baselines' AND column_name = 'baseline_date') THEN

    ALTER TABLE wbs_baselines ADD COLUMN IF NOT EXISTS notes TEXT;
    ALTER TABLE wbs_baselines ADD COLUMN IF NOT EXISTS data_date DATE;
    ALTER TABLE wbs_baselines ADD COLUMN IF NOT EXISTS contract_start DATE;
    ALTER TABLE wbs_baselines ADD COLUMN IF NOT EXISTS contract_completion DATE;
    ALTER TABLE wbs_baselines ADD COLUMN IF NOT EXISTS forecast_finish DATE;
    ALTER TABLE wbs_baselines ADD COLUMN IF NOT EXISTS created_by VARCHAR;
    ALTER TABLE wbs_baselines ADD COLUMN IF NOT EXISTS activities JSONB NOT NULL DEFAULT '[]';

    -- That design counted days from a fixed 07-Nov-2025 and a 912-day
    -- contract, so its snapshots are dated on that basis.
    UPDATE wbs_baselines SET
      notes               = COALESCE(notes, description),
      data_date           = COALESCE(data_date, baseline_date, created_at::date),
      contract_start      = COALESCE(contract_start, DATE '2025-11-07'),
      contract_completion = COALESCE(contract_completion, DATE '2028-05-07'),
      forecast_finish     = COALESCE(forecast_finish, DATE '2025-11-07' + COALESCE(project_duration_days, 912) - 1),
      is_active           = COALESCE(is_active, false);

    IF to_regclass('public.wbs_baseline_tasks') IS NOT NULL THEN
      -- Its day indices ran from 0 with an exclusive finish; dates here are
      -- inclusive, and a milestone reached when work finishes is shown on the
      -- day that work ends, as the schedule shows it.
      UPDATE wbs_baselines b SET activities = COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
                   'wbsCode', t.wbs_code,
                   'title', t.title,
                   'plannedDuration', COALESCE(t.planned_duration, 0),
                   'forecastStart', to_char(DATE '2025-11-07' + CASE
                       WHEN t.early_finish = t.early_start AND t.early_start > 0 THEN t.early_start - 1
                       ELSE COALESCE(t.early_start, 0) END, 'YYYY-MM-DD'),
                   'forecastFinish', to_char(DATE '2025-11-07' + CASE
                       WHEN t.early_finish > t.early_start THEN t.early_finish - 1
                       WHEN t.early_start > 0 THEN t.early_start - 1
                       ELSE 0 END, 'YYYY-MM-DD'),
                   'isCritical', COALESCE(t.is_critical, false),
                   'totalFloat', COALESCE(t.total_float, 0),
                   'weight', COALESCE(t.payment_pct, 0))
                 ORDER BY t.wbs_code)
            FROM wbs_baseline_tasks t WHERE t.baseline_id = b.id), '[]'::jsonb)
       WHERE b.activities = '[]'::jsonb;
    END IF;

    -- Only one accepted programme per project: keep the newest active one.
    UPDATE wbs_baselines b SET is_active = false
     WHERE is_active AND EXISTS (SELECT 1 FROM wbs_baselines o
                                  WHERE o.project_id = b.project_id AND o.is_active AND o.created_at > b.created_at);

    ALTER TABLE wbs_baselines
      ALTER COLUMN project_id TYPE VARCHAR,
      ALTER COLUMN name TYPE VARCHAR,
      ALTER COLUMN data_date SET NOT NULL,
      ALTER COLUMN contract_start SET NOT NULL,
      ALTER COLUMN contract_completion SET NOT NULL,
      ALTER COLUMN is_active SET NOT NULL,
      ALTER COLUMN is_active SET DEFAULT false,
      ALTER COLUMN created_at TYPE TIMESTAMP USING created_at AT TIME ZONE 'UTC',
      ALTER COLUMN created_at SET DEFAULT now(),
      ALTER COLUMN created_at SET NOT NULL,
      ALTER COLUMN updated_at TYPE TIMESTAMP USING updated_at AT TIME ZONE 'UTC',
      ALTER COLUMN updated_at SET DEFAULT now(),
      ALTER COLUMN updated_at SET NOT NULL;

    ALTER TABLE wbs_baselines
      DROP COLUMN IF EXISTS description,
      DROP COLUMN IF EXISTS baseline_date,
      DROP COLUMN IF EXISTS is_approved,
      DROP COLUMN IF EXISTS total_tasks,
      DROP COLUMN IF EXISTS project_duration_days;

    DROP INDEX IF EXISTS idx_wbs_baselines_project_id;
    CREATE INDEX IF NOT EXISTS idx_wbs_baselines_project ON wbs_baselines (project_id, created_at);
    DROP TABLE IF EXISTS wbs_baseline_tasks;
  END IF;
END $$;
