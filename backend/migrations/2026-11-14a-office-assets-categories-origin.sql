-- Asset register: plant & machinery and survey/lab instrument categories, and
-- where an asset came from. Runs on every boot, so each change is guarded.
--
-- category: adds 'plant_machinery' and 'instrument' to the allowed list.
-- acquisition: 'purchased' (bought new), 'purchased_used' (bought second-hand),
--   'transferred' (from another company site) or 'legacy' (carried over from
--   an earlier project); NULL when not recorded.
-- source_site: the site or project a transferred or legacy asset came from.

ALTER TABLE office_assets ADD COLUMN IF NOT EXISTS acquisition varchar(20);
ALTER TABLE office_assets ADD COLUMN IF NOT EXISTS source_site varchar(200);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'office_assets'::regclass AND conname = 'office_assets_category_check'
      AND pg_get_constraintdef(oid) LIKE '%plant_machinery%'
  ) THEN
    ALTER TABLE office_assets DROP CONSTRAINT IF EXISTS office_assets_category_check;
    ALTER TABLE office_assets ADD CONSTRAINT office_assets_category_check CHECK (category IN (
      'furniture', 'computer', 'laptop', 'printer', 'vehicle', 'plant_machinery', 'instrument', 'office_equipment', 'other'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'office_assets'::regclass AND conname = 'office_assets_acquisition_check'
      AND pg_get_constraintdef(oid) LIKE '%purchased_used%'
  ) THEN
    ALTER TABLE office_assets DROP CONSTRAINT IF EXISTS office_assets_acquisition_check;
    ALTER TABLE office_assets ADD CONSTRAINT office_assets_acquisition_check CHECK (
      acquisition IS NULL OR acquisition IN ('purchased', 'purchased_used', 'transferred', 'legacy'));
  END IF;
END $$;
