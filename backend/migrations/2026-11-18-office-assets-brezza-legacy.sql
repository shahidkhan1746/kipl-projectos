-- The Maruti Suzuki Brezza came from KIPL's 2014 project, not this one. The
-- opening inventory (2026-11-14b) loaded it as bought new for this site; this
-- moves it to the Legacy assets list (acquisition 'legacy'), so it is no longer
-- counted in this project's register. The record, its tag and its history stay.
--
-- Runs on every boot like the other migrations, but changes the asset once:
--   * the change is recorded as an 'updated' event with a fixed id, and nothing
--     happens once that event exists;
--   * nothing happens if a person has already changed where the Brezza came
--     from in the app (an 'updated' event that changed its acquisition), so
--     this never overrides an edit someone made by hand;
--   * nothing happens without an active super admin to record it under, the
--     same rule the opening inventory follows.
-- Matched by the fixed id the opening inventory gave it, so no asset a person
-- registered is touched.

WITH actor AS (
  SELECT id, name FROM users WHERE role::text = 'super_admin' AND is_active ORDER BY created_at LIMIT 1
),
old AS (
  SELECT a.* FROM office_assets a
  WHERE a.id = 'a55e7000-0000-4000-8000-000000000004'
    AND a.acquisition IS DISTINCT FROM 'legacy'
    AND EXISTS (SELECT 1 FROM actor)
    AND NOT EXISTS (SELECT 1 FROM office_asset_events e WHERE e.id = 'a55e7000-0000-4000-8000-000000000104')
    AND NOT EXISTS (
      SELECT 1 FROM office_asset_events e
      WHERE e.asset_id = a.id AND e.action = 'updated'
        AND (e."before"->>'acquisition') IS DISTINCT FROM (e."after"->>'acquisition'))
),
upd AS (
  UPDATE office_assets a
  SET acquisition = 'legacy',
      source_site = '2014 project',
      notes = COALESCE(NULLIF(TRIM(a.notes), ''), 'Bought new for KIPL''s 2014 project and carried over to this site.'),
      version = a.version + 1,
      updated_at = now()
  FROM old
  WHERE a.id = old.id
  RETURNING a.*
),
snap AS (
  SELECT 'before' AS k, o.* FROM old o
  UNION ALL
  SELECT 'after' AS k, u.* FROM upd u
),
js AS (
  SELECT s.k, jsonb_build_object(
    'id', s.id, 'projectId', s.project_id, 'assetTag', s.asset_tag, 'name', s.name,
    'category', s.category, 'location', s.location, 'status', s.status, 'condition', s.condition,
    'brand', s.brand, 'model', s.model, 'serialNumber', s.serial_number, 'supplier', s.supplier,
    'invoiceNumber', s.invoice_number, 'purchaseDate', s.purchase_date, 'purchaseCost', s.purchase_cost, 'warrantyUntil', s.warranty_until,
    'registrationNumber', s.registration_number, 'insuranceUntil', s.insurance_until, 'serviceDue', s.service_due, 'documentUrl', s.document_url,
    'photoUrl', s.photo_url, 'notes', s.notes, 'acquisition', s.acquisition, 'sourceSite', s.source_site,
    'assignedEmployeeId', s.assigned_employee_id, 'assignedTo', s.assigned_to, 'lastVerified', s.last_verified, 'version', s.version,
    'createdAt', s.created_at, 'updatedAt', s.updated_at) AS j
  FROM snap s
)
INSERT INTO office_asset_events (id, asset_id, project_id, action, event_date, reason, actor_id, actor_name, "before", "after")
SELECT 'a55e7000-0000-4000-8000-000000000104', u.id, u.project_id, 'updated', CURRENT_DATE,
  'Moved to Legacy assets: the Brezza came from the 2014 project and is not counted in this project''s register.',
  a.id, COALESCE(NULLIF(a.name, ''), 'User'),
  (SELECT j FROM js WHERE k = 'before'), (SELECT j FROM js WHERE k = 'after')
FROM upd u CROSS JOIN actor a;
