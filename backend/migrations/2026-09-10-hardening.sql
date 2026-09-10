ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_count int DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_hash varchar;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires timestamptz;

ALTER TABLE salary_records ADD COLUMN IF NOT EXISTS generated_by varchar;

ALTER TABLE ncrs ADD COLUMN IF NOT EXISTS verified_by varchar;
ALTER TABLE ncrs ADD COLUMN IF NOT EXISTS verified_at timestamptz;

ALTER TABLE projects ADD COLUMN IF NOT EXISTS site_lat numeric(10,6);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS site_lng numeric(10,6);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS geofence_radius_m int;

CREATE INDEX IF NOT EXISTS idx_site_diaries_project_date ON site_diaries (project_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON attendance (employee_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_project ON attendance (project_id);

ALTER TABLE ra_bills ADD COLUMN IF NOT EXISTS other_deductions numeric(15,2) DEFAULT 0;
ALTER TABLE ra_bills ADD COLUMN IF NOT EXISTS ncr_deductions jsonb DEFAULT '[]'::jsonb;
ALTER TABLE qa_inspections ADD COLUMN IF NOT EXISTS photos jsonb DEFAULT '[]'::jsonb;
