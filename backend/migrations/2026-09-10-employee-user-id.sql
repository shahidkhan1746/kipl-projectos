-- Link employees to login accounts. Production does not run TypeORM synchronize.
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS user_id uuid UNIQUE;

CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees (user_id)
  WHERE user_id IS NOT NULL;

-- Backfill from matching emails where a single active employee maps to a user.
UPDATE employees e
SET user_id = u.id
FROM users u
WHERE e.user_id IS NULL
  AND e.email IS NOT NULL
  AND LOWER(TRIM(e.email)) = LOWER(TRIM(u.email));
