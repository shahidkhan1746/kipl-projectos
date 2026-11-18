-- Opening inventory of the Dal Lake Sewerage Scheme site, 38 assets.
--
-- Runs on every boot like the other migrations and is a no-op after the first:
-- each item has a fixed id, and only items whose id is not yet in the register
-- are added. Records staff edit, transfer or dispose of afterwards are never
-- touched again. It does nothing unless the Dal Lake project and an active
-- super admin exist, so other databases are left alone.
--
-- Tags are allocated like AssetsService.create: under the same advisory lock,
-- continuing from the highest KIPL-AST number, without wrapping at six digits.
-- Each new record gets the same 'created' history event the app writes,
-- recorded against the earliest active super admin.
--
-- Only what is known is filled in. Serial and registration numbers, purchase
-- details and custodians are left for the site to complete in the app.

SELECT pg_advisory_xact_lock(74191, 1);

WITH seed (ord, id, name, category, location, condition, brand, model, acquisition, source_site, notes) AS (
  VALUES
    (1, 'a55e7000-0000-4000-8000-000000000001'::uuid, 'Porta cabin', 'other', 'Nishat STP site', 'new', NULL, NULL, 'purchased', NULL, NULL),
    (2, 'a55e7000-0000-4000-8000-000000000002'::uuid, 'Porta cabin', 'other', 'Nishat STP site', 'good', NULL, NULL, 'transferred', 'Ghaziabad site', NULL),
    (3, 'a55e7000-0000-4000-8000-000000000003'::uuid, 'Porta cabin', 'other', 'Nishat STP site', 'good', NULL, NULL, 'legacy', 'Achan Landfill Site', NULL),
    (4, 'a55e7000-0000-4000-8000-000000000004'::uuid, 'Maruti Suzuki Brezza', 'vehicle', 'Nishat STP site', 'good', 'Maruti Suzuki', 'Brezza', 'purchased', NULL, NULL),
    (5, 'a55e7000-0000-4000-8000-000000000005'::uuid, 'Maruti Suzuki Wagon R', 'vehicle', 'Nishat STP site', 'good', 'Maruti Suzuki', 'Wagon R', 'purchased_used', NULL, NULL),
    (6, 'a55e7000-0000-4000-8000-000000000006'::uuid, 'TVS Jupiter scooter', 'vehicle', 'Nishat STP site', 'good', 'TVS', 'Jupiter', 'purchased_used', NULL, 'Bought second-hand locally. Used by the labour team.'),
    (7, 'a55e7000-0000-4000-8000-000000000007'::uuid, 'Bajaj Chetak electric scooter', 'vehicle', 'Nishat STP site', 'good', 'Bajaj', 'Chetak Premium', 'purchased_used', NULL, 'Bought second-hand locally. Used for office and liaison work.'),
    (8, 'a55e7000-0000-4000-8000-000000000008'::uuid, 'Komatsu PC210 excavator', 'plant_machinery', 'Nishat STP site', 'good', 'Komatsu', 'PC210-10M0', 'transferred', 'Ghaziabad site', '20-tonne crawler excavator ("Poclain" on site). Recorded as the PC210-10M0, the India-built model since 2019; check the machine plate (the long-track version is the PC210LC-10M0).'),
    (9, 'a55e7000-0000-4000-8000-000000000009'::uuid, 'JCB 3DX backhoe loader', 'plant_machinery', 'Nishat STP site', 'good', 'JCB', '3DX Plus 2WD', 'transferred', 'Ahmedabad site', 'Recorded from "JCB 3DX + 2WD"; check the variant on the machine plate.'),
    (10, 'a55e7000-0000-4000-8000-000000000010'::uuid, 'Mahindra Powerol DG set', 'plant_machinery', 'Nishat STP site', 'good', 'Mahindra Powerol', NULL, 'transferred', 'Ghaziabad site', 'Diesel generator. Record the kVA rating and engine number from the plate.'),
    (11, 'a55e7000-0000-4000-8000-000000000011'::uuid, 'Bosch concrete breaker', 'plant_machinery', 'Nishat STP site', 'good', 'Bosch', NULL, NULL, NULL, NULL),
    (12, 'a55e7000-0000-4000-8000-000000000012'::uuid, 'Honda brush cutter', 'plant_machinery', 'Nishat STP site', 'good', 'Honda', NULL, NULL, NULL, NULL),
    (13, 'a55e7000-0000-4000-8000-000000000013'::uuid, 'Laptop', 'laptop', 'Site office, Nishat', 'good', NULL, NULL, NULL, NULL, NULL),
    (14, 'a55e7000-0000-4000-8000-000000000014'::uuid, 'Laptop', 'laptop', 'Site office, Nishat', 'good', NULL, NULL, NULL, NULL, NULL),
    (15, 'a55e7000-0000-4000-8000-000000000015'::uuid, 'Laptop', 'laptop', 'Site office, Nishat', 'good', NULL, NULL, NULL, NULL, NULL),
    (16, 'a55e7000-0000-4000-8000-000000000016'::uuid, 'Desktop computer', 'computer', 'Site office, Nishat', 'good', NULL, NULL, NULL, NULL, NULL),
    (17, 'a55e7000-0000-4000-8000-000000000017'::uuid, 'Desktop computer', 'computer', 'Site office, Nishat', 'good', NULL, NULL, NULL, NULL, NULL),
    (18, 'a55e7000-0000-4000-8000-000000000018'::uuid, 'Printer', 'printer', 'Site office, Nishat', 'good', NULL, NULL, NULL, NULL, NULL),
    (19, 'a55e7000-0000-4000-8000-000000000019'::uuid, 'Printer', 'printer', 'Site office, Nishat', 'good', NULL, NULL, NULL, NULL, NULL),
    (20, 'a55e7000-0000-4000-8000-000000000020'::uuid, 'Epson colour printer', 'printer', 'Site office, Nishat', 'good', 'Epson', NULL, NULL, NULL, NULL),
    (21, 'a55e7000-0000-4000-8000-000000000021'::uuid, 'CCTV system', 'office_equipment', 'Site office, Nishat', 'good', 'CP Plus', NULL, NULL, NULL, 'Cameras and recorder recorded as one set.'),
    (22, 'a55e7000-0000-4000-8000-000000000022'::uuid, 'Airtel fibre modem', 'office_equipment', 'Site office, Nishat', 'good', 'Airtel', NULL, NULL, NULL, NULL),
    (23, 'a55e7000-0000-4000-8000-000000000023'::uuid, 'Water dispenser', 'office_equipment', 'Site office, Nishat', 'good', 'Blue Star', NULL, NULL, NULL, NULL),
    (24, 'a55e7000-0000-4000-8000-000000000024'::uuid, 'Induction cooker', 'office_equipment', 'Site office, Nishat', 'good', NULL, NULL, NULL, NULL, NULL),
    (25, 'a55e7000-0000-4000-8000-000000000025'::uuid, 'Almirah', 'furniture', 'Site office, Nishat', 'good', NULL, NULL, NULL, NULL, NULL),
    (26, 'a55e7000-0000-4000-8000-000000000026'::uuid, 'Table', 'furniture', 'Site office, Nishat', 'good', NULL, NULL, NULL, NULL, NULL),
    (27, 'a55e7000-0000-4000-8000-000000000027'::uuid, 'Table', 'furniture', 'Site office, Nishat', 'good', NULL, NULL, NULL, NULL, NULL),
    (28, 'a55e7000-0000-4000-8000-000000000028'::uuid, 'Chair', 'furniture', 'Site office, Nishat', 'good', NULL, NULL, NULL, NULL, NULL),
    (29, 'a55e7000-0000-4000-8000-000000000029'::uuid, 'Chair', 'furniture', 'Site office, Nishat', 'good', NULL, NULL, NULL, NULL, NULL),
    (30, 'a55e7000-0000-4000-8000-000000000030'::uuid, 'Chair', 'furniture', 'Site office, Nishat', 'good', NULL, NULL, NULL, NULL, NULL),
    (31, 'a55e7000-0000-4000-8000-000000000031'::uuid, 'Chair', 'furniture', 'Site office, Nishat', 'good', NULL, NULL, NULL, NULL, NULL),
    (32, 'a55e7000-0000-4000-8000-000000000032'::uuid, 'Chair', 'furniture', 'Site office, Nishat', 'good', NULL, NULL, NULL, NULL, NULL),
    (33, 'a55e7000-0000-4000-8000-000000000033'::uuid, 'Chair', 'furniture', 'Site office, Nishat', 'good', NULL, NULL, NULL, NULL, NULL),
    (34, 'a55e7000-0000-4000-8000-000000000034'::uuid, 'File rack', 'furniture', 'Site office, Nishat', 'good', NULL, NULL, NULL, NULL, NULL),
    (35, 'a55e7000-0000-4000-8000-000000000035'::uuid, 'Topcon auto level', 'instrument', 'Site office, Nishat', 'good', 'Topcon', NULL, NULL, NULL, NULL),
    (36, 'a55e7000-0000-4000-8000-000000000036'::uuid, 'Auto level', 'instrument', 'Site office, Nishat', 'fair', NULL, NULL, NULL, NULL, 'Older instrument.'),
    (37, 'a55e7000-0000-4000-8000-000000000037'::uuid, 'Total station', 'instrument', 'Site office, Nishat', 'good', NULL, NULL, 'transferred', 'Kolkata site', NULL),
    (38, 'a55e7000-0000-4000-8000-000000000038'::uuid, 'Compression testing machine', 'instrument', 'Nishat STP site', 'fair', NULL, NULL, 'transferred', 'Noida site', 'Older machine (CTM) for concrete cube testing.')
),
project AS (SELECT id::text AS id FROM projects WHERE id = '4a5176c7-0f53-42cc-bbd8-1a7259648a96'),
actor AS (SELECT id, name FROM users WHERE role::text = 'super_admin' AND is_active ORDER BY created_at LIMIT 1),
todo AS (
  SELECT s.*, row_number() OVER (ORDER BY s.ord) AS n
  FROM seed s
  WHERE EXISTS (SELECT 1 FROM project) AND EXISTS (SELECT 1 FROM actor)
    AND NOT EXISTS (SELECT 1 FROM office_assets a WHERE a.id = s.id)
),
base AS (
  SELECT COALESCE(MAX(SUBSTRING(asset_tag FROM 10)::numeric), 0) AS m
  FROM office_assets WHERE asset_tag ~ '^KIPL-AST-[0-9]+$'
),
ins AS (
  INSERT INTO office_assets (id, project_id, asset_tag, name, category, location, status, condition, brand, model, acquisition, source_site, notes, version)
  SELECT t.id, p.id,
         'KIPL-AST-' || lpad((b.m + t.n)::text, greatest(6, length((b.m + t.n)::text)), '0'),
         t.name, t.category, t.location, 'available', t.condition, t.brand, t.model, t.acquisition, t.source_site, t.notes, 1
  FROM todo t CROSS JOIN base b CROSS JOIN project p
  ON CONFLICT (id) DO NOTHING
  RETURNING *
)
INSERT INTO office_asset_events (asset_id, project_id, action, event_date, reason, actor_id, actor_name, "before", "after")
SELECT i.id, i.project_id, 'created', CURRENT_DATE, 'Asset registered (opening inventory)', a.id, COALESCE(NULLIF(a.name, ''), 'User'), NULL,
  jsonb_build_object(
    'id', i.id, 'projectId', i.project_id, 'assetTag', i.asset_tag, 'name', i.name,
    'category', i.category, 'location', i.location, 'status', i.status, 'condition', i.condition,
    'brand', i.brand, 'model', i.model, 'serialNumber', i.serial_number, 'supplier', i.supplier,
    'invoiceNumber', i.invoice_number, 'purchaseDate', i.purchase_date, 'purchaseCost', i.purchase_cost, 'warrantyUntil', i.warranty_until,
    'registrationNumber', i.registration_number, 'insuranceUntil', i.insurance_until, 'serviceDue', i.service_due, 'documentUrl', i.document_url,
    'photoUrl', i.photo_url, 'notes', i.notes, 'acquisition', i.acquisition, 'sourceSite', i.source_site,
    'assignedEmployeeId', i.assigned_employee_id, 'assignedTo', i.assigned_to, 'lastVerified', i.last_verified, 'version', i.version,
    'createdAt', i.created_at, 'updatedAt', i.updated_at)
FROM ins i CROSS JOIN actor a;
