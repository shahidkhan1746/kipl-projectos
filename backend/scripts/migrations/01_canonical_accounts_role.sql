-- ============================================================
-- Migration: 01_canonical_accounts_role.sql
-- Description: Standardize legacy 'accountant' role to 'accounts'
-- ============================================================

-- Update any existing users with role 'accountant' to canonical 'accounts'
UPDATE users 
SET role = 'accounts' 
WHERE role = 'accountant';

-- Optional: If using native postgres enum for user_role_enum
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'users_role_enum') THEN
    -- Ensure 'accounts' is present in the enum
    ALTER TYPE users_role_enum ADD VALUE IF NOT EXISTS 'accounts';
  END IF;
END$$;
