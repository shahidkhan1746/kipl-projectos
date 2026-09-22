-- Migration: 2026-09-22-qa-cube-tests.sql
-- Description: Concrete Cube Compressive Strength Laboratory Testing Table

CREATE TABLE IF NOT EXISTS qa_cube_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id VARCHAR(64) NOT NULL,
  sample_code VARCHAR(64) NOT NULL,
  pour_location VARCHAR(255) NOT NULL,
  structure_element VARCHAR(128) NOT NULL,
  grade VARCHAR(32) NOT NULL,
  cement_type VARCHAR(32) NOT NULL DEFAULT 'OPC_53',
  cast_date DATE NOT NULL,
  batch_or_mix_id VARCHAR(128),
  curing_method VARCHAR(64) DEFAULT 'Water Curing',
  curing_temp_celsius NUMERIC(5, 2) DEFAULT 20.0,
  fck_required_mpa NUMERIC(6, 2) NOT NULL,

  -- 7-Day test
  test_7d_date DATE,
  load_7d_1_kn NUMERIC(8, 2),
  load_7d_2_kn NUMERIC(8, 2),
  load_7d_3_kn NUMERIC(8, 2),
  avg_strength_7d_mpa NUMERIC(6, 2),
  predicted_28d_mpa NUMERIC(6, 2),
  status_7d VARCHAR(32) DEFAULT 'PENDING',

  -- 28-Day test
  test_28d_date DATE,
  load_28d_1_kn NUMERIC(8, 2),
  load_28d_2_kn NUMERIC(8, 2),
  load_28d_3_kn NUMERIC(8, 2),
  avg_strength_28d_mpa NUMERIC(6, 2),
  status_28d VARCHAR(32) DEFAULT 'PENDING',

  overall_status VARCHAR(32) DEFAULT 'CAST',
  technician_name VARCHAR(128),
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qa_cube_tests_project ON qa_cube_tests (project_id);
CREATE INDEX IF NOT EXISTS idx_qa_cube_tests_cast_date ON qa_cube_tests (cast_date DESC);
CREATE INDEX IF NOT EXISTS idx_qa_cube_tests_grade ON qa_cube_tests (grade);
CREATE INDEX IF NOT EXISTS idx_qa_cube_tests_status ON qa_cube_tests (overall_status);
