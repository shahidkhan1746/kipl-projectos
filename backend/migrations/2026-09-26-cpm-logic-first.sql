-- Migration: 2026-09-26-cpm-logic-first.sql
-- Description: Schema for the logic-first CPM (calendars, scope, constraints,
--              free float, baselines) and the data corrections the CPM audit
--              identified. Runs at every boot, so every statement is idempotent
--              and every data fix only touches rows still in the seed's shape —
--              a programme someone has re-planned by hand is left alone.

-- ── Columns ────────────────────────────────────────────────────────────────
ALTER TABLE wbs_tasks ADD COLUMN IF NOT EXISTS calendar VARCHAR(24) NOT NULL DEFAULT 'seven_day';
ALTER TABLE wbs_tasks ADD COLUMN IF NOT EXISTS schedule_scope VARCHAR(20) NOT NULL DEFAULT 'contract';
ALTER TABLE wbs_tasks ADD COLUMN IF NOT EXISTS constraint_type VARCHAR(8);
ALTER TABLE wbs_tasks ADD COLUMN IF NOT EXISTS constraint_date DATE;
ALTER TABLE wbs_tasks ADD COLUMN IF NOT EXISTS free_float INTEGER NOT NULL DEFAULT 0;

-- ── Baselines ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wbs_baselines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id VARCHAR NOT NULL,
  name VARCHAR NOT NULL,
  notes TEXT,
  data_date DATE NOT NULL,
  contract_start DATE NOT NULL,
  contract_completion DATE NOT NULL,
  forecast_finish DATE,
  created_by VARCHAR,
  activities JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wbs_baselines_project ON wbs_baselines (project_id, created_at);

-- ── F-04: the free trial run and O&M follow completion ─────────────────────
-- The tender's 30 months exclude the six-month trial run. Both are scheduled,
-- but outside the contract network, so neither can set the contract finish or
-- become its critical path. The trial run is 182 days of work, not a milestone.
UPDATE wbs_tasks SET schedule_scope = 'post_completion'
 WHERE schedule_scope <> 'post_completion'
   AND (title ILIKE '%free trial run%' OR title ILIKE 'O&M Period%');
UPDATE wbs_tasks SET is_milestone = false
 WHERE is_milestone = true AND planned_duration > 0 AND title ILIKE '%trial run%';

-- Completion followed the trial run (M6 ← 9). Put completion after testing and
-- road reinstatement, and the trial run after completion. Only when both rows
-- still carry exactly the seeded links.
UPDATE wbs_tasks m
   SET dependencies = '[{"code":"8","type":"FS","lag":0},{"code":"7","type":"FS","lag":0}]'::jsonb,
       predecessors = '8, 7'
 WHERE m.wbs_code = 'M6'
   AND m.title ILIKE 'MILESTONE: Completion Certificate%'
   AND ( (jsonb_array_length(m.dependencies) = 1 AND m.dependencies->0->>'code' = '9')
      OR (jsonb_array_length(m.dependencies) = 0 AND trim(coalesce(m.predecessors, '')) = '9') )
   AND EXISTS (SELECT 1 FROM wbs_tasks t WHERE t.project_id = m.project_id AND t.wbs_code = '8')
   AND EXISTS (SELECT 1 FROM wbs_tasks t WHERE t.project_id = m.project_id AND t.wbs_code = '7');

UPDATE wbs_tasks t
   SET dependencies = '[{"code":"M6","type":"FS","lag":0}]'::jsonb,
       predecessors = 'M6'
 WHERE t.wbs_code = '9'
   AND t.title ILIKE '%trial run%'
   AND ( (jsonb_array_length(t.dependencies) = 1 AND t.dependencies->0->>'code' = '8')
      OR (jsonb_array_length(t.dependencies) = 0 AND trim(coalesce(t.predecessors, '')) = '8') )
   AND EXISTS (SELECT 1 FROM wbs_tasks m WHERE m.project_id = t.project_id AND m.wbs_code = 'M6'
               AND m.dependencies @> '[{"code":"8"}]'::jsonb);

-- ── F-12: the DSP seal holds site possession ───────────────────────────────
-- 0.6 had no successor, so stretching the seal moved nothing.
UPDATE wbs_tasks m
   SET dependencies = m.dependencies || '[{"code":"0.6","type":"FS","lag":0}]'::jsonb,
       predecessors = CASE WHEN coalesce(m.predecessors, '') = '' THEN '0.6' ELSE m.predecessors || ', 0.6' END
 WHERE m.wbs_code = 'M0'
   AND m.title ILIKE 'MILESTONE: Site Handover%'
   AND jsonb_typeof(m.dependencies) = 'array'
   AND NOT (m.dependencies @> '[{"code":"0.6"}]'::jsonb)
   AND EXISTS (SELECT 1 FROM wbs_tasks t WHERE t.project_id = m.project_id AND t.wbs_code = '0.6');

-- ── F-08: activities created with dates but no duration ────────────────────
UPDATE wbs_tasks
   SET planned_duration = (planned_end - planned_start) + 1
 WHERE planned_duration = 0
   AND is_milestone = false
   AND planned_start IS NOT NULL AND planned_end IS NOT NULL
   AND planned_end >= planned_start;

-- ── F-20: activity codes are unique within a project ───────────────────────
-- Only once the data allows it; a duplicate is reported by the schedule as an
-- error, and the index follows on the first boot after it is fixed.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM wbs_tasks GROUP BY project_id, wbs_code HAVING count(*) > 1
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS uq_wbs_tasks_project_code ON wbs_tasks (project_id, wbs_code);
  END IF;
END $$;
