-- Migration: Add videos column to project_updates table
-- Date: 2026-08-29
-- Description: Adds jsonb videos column with empty array default

ALTER TABLE project_updates ADD COLUMN IF NOT EXISTS videos jsonb DEFAULT '[]'::jsonb;
