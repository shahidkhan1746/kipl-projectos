-- Employee ID-card fields. Run in Supabase → SQL Editor before the backend deploy.
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS blood_group     varchar,
  ADD COLUMN IF NOT EXISTS emergency_name  varchar,
  ADD COLUMN IF NOT EXISTS emergency_phone varchar;
