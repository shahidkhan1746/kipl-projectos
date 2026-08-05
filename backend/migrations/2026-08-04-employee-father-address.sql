-- Employee ID-card template fields. Run in Supabase → SQL Editor before deploy.
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS father_name varchar,
  ADD COLUMN IF NOT EXISTS address     text;
