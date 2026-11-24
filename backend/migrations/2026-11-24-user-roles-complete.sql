-- Every role the app offers must exist on the users.role enum.
--
-- Production does not let TypeORM synchronise the schema, and no migration
-- added the roles that came after the first deploy (HR officer, liaison
-- officer, accountant, field staff). Creating a login with one of them failed
-- in the database. The HR employee form used to swallow that failure, so the
-- employee saved, no login existed, and the person was told "Invalid
-- credentials" at sign-in.
--
-- Safe to run repeatedly: ADD VALUE IF NOT EXISTS is a no-op for values that
-- are there, and nothing happens if the column is not an enum on this host.
DO $$
DECLARE
  r text;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'users_role_enum') THEN
    FOREACH r IN ARRAY ARRAY[
      'super_admin', 'admin', 'project_manager', 'engineer', 'accounts',
      'qa_engineer', 'supervisor', 'hr_officer', 'liaison_officer',
      'accountant', 'field_staff', 'viewer'
    ] LOOP
      EXECUTE format('ALTER TYPE users_role_enum ADD VALUE IF NOT EXISTS %L', r);
    END LOOP;
  END IF;
END $$;
