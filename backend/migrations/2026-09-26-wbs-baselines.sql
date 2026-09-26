-- WBS Baseline & S-Curve Comparison Schema
-- Creates tables for storing baseline schedule snapshots and baseline task records

CREATE TABLE IF NOT EXISTS wbs_baselines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  baseline_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_approved BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT FALSE,
  total_tasks INT DEFAULT 0,
  project_duration_days INT DEFAULT 912,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wbs_baselines_project_id ON wbs_baselines(project_id);

CREATE TABLE IF NOT EXISTS wbs_baseline_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baseline_id UUID NOT NULL REFERENCES wbs_baselines(id) ON DELETE CASCADE,
  wbs_code VARCHAR(32) NOT NULL,
  title VARCHAR(255) NOT NULL,
  planned_start DATE NOT NULL,
  planned_end DATE NOT NULL,
  planned_duration INT DEFAULT 0,
  payment_pct NUMERIC(5,2) DEFAULT 0,
  early_start INT DEFAULT 0,
  early_finish INT DEFAULT 0,
  late_start INT DEFAULT 0,
  late_finish INT DEFAULT 0,
  total_float INT DEFAULT 0,
  is_critical BOOLEAN DEFAULT FALSE,
  dependencies JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wbs_baseline_tasks_baseline_id ON wbs_baseline_tasks(baseline_id);
CREATE INDEX IF NOT EXISTS idx_wbs_baseline_tasks_wbs_code ON wbs_baseline_tasks(wbs_code);
