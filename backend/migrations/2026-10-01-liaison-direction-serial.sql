-- Add direction enum and serial_no to liaison_files
DO $$ BEGIN
  CREATE TYPE liaison_direction AS ENUM ('outgoing', 'incoming', 'internal');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE liaison_files
  ADD COLUMN IF NOT EXISTS direction liaison_direction NOT NULL DEFAULT 'outgoing',
  ADD COLUMN IF NOT EXISTS serial_no integer NOT NULL DEFAULT 0;

-- Back-fill serial numbers for existing rows ordered by creation date
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY created_at ASC) AS rn
  FROM liaison_files
)
UPDATE liaison_files SET serial_no = numbered.rn
FROM numbered WHERE liaison_files.id = numbered.id AND liaison_files.serial_no = 0;
