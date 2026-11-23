-- The Dal Lake site's fuel register as it stood on paper (Diesel_Log.xlsx,
-- 20–23 Nov 2026), and the machines that draw diesel:
--
--   Komatsu PC210 excavator ("the Poclain")  own        operator Rinku
--   JCB 3DX backhoe loader                   own        operator Yasir
--   Mahindra Powerol DG set                  own
--   Sany excavator                           hired from Wani Infra
--   Road roller                              hired from Wani Infra
--
-- Owned machines are linked to their asset register records when those exist.
-- The sheet's entries come across as written: 20 L opening stock, 400 L and
-- 600 L bought (no rate recorded), 720 L issued, leaving 300 L.
--
-- Runs on every boot and is a no-op after the first: every row has a fixed id
-- and is only added if absent, so edits and voids made in the app stay. Does
-- nothing unless the Dal Lake project exists.

INSERT INTO fuel_machines (id, project_id, name, kind, ownership, owner_name, asset_id, operator, fuel_type, meter_unit, logbook_names)
SELECT m.id, p.id::text, m.name, m.kind, m.ownership, m.owner_name,
       (SELECT a.id FROM office_assets a WHERE a.id = m.asset_id), m.operator, 'diesel', 'hours', m.logbook_names
FROM (VALUES
  ('f0e17000-0000-4000-8000-000000000001'::uuid, 'Komatsu PC210 excavator', 'Excavator', 'owned', NULL, 'a55e7000-0000-4000-8000-000000000008'::uuid, 'Rinku', 'PC210, Poclain, Poklain, Komatsu'),
  ('f0e17000-0000-4000-8000-000000000002'::uuid, 'JCB 3DX backhoe loader', 'Backhoe loader', 'owned', NULL, 'a55e7000-0000-4000-8000-000000000009'::uuid, 'Yasir', 'JCB, JCB-01, JCB 3DX'),
  ('f0e17000-0000-4000-8000-000000000003'::uuid, 'Mahindra Powerol DG set', 'DG set', 'owned', NULL, 'a55e7000-0000-4000-8000-000000000010'::uuid, NULL, 'DG, DG set, Generator'),
  ('f0e17000-0000-4000-8000-000000000004'::uuid, 'Sany excavator', 'Excavator', 'hired', 'Wani Infra', NULL::uuid, NULL, 'Sany, Sany Poclain'),
  ('f0e17000-0000-4000-8000-000000000005'::uuid, 'Road roller', 'Roller', 'hired', 'Wani Infra', NULL::uuid, NULL, 'Roller')
) AS m (id, name, kind, ownership, owner_name, asset_id, operator, logbook_names)
CROSS JOIN (SELECT id FROM projects WHERE id = '4a5176c7-0f53-42cc-bbd8-1a7259648a96') p
ON CONFLICT (id) DO NOTHING;

INSERT INTO fuel_entries (id, project_id, entry_type, fuel_type, date, litres, machine_id, operator, remarks, recorded_by_name, created_at, updated_at)
SELECT e.id, p.id::text, e.entry_type, 'diesel', e.date, e.litres, m.id, e.operator, e.remarks, 'Imported from the diesel log sheet',
       '2026-11-23 06:00:00'::timestamp + e.n * interval '1 second', '2026-11-23 06:00:00'::timestamp + e.n * interval '1 second'
FROM (VALUES
  (1, 'f0e17000-0000-4000-8000-000000000101'::uuid, 'adjustment', '2026-11-20'::date, 20,  NULL::uuid, NULL, 'Opening stock, from the diesel log sheet'),
  (2, 'f0e17000-0000-4000-8000-000000000102'::uuid, 'receipt',    '2026-11-20'::date, 400, NULL::uuid, NULL, 'From the diesel log sheet; rate not recorded'),
  (3, 'f0e17000-0000-4000-8000-000000000103'::uuid, 'issue',      '2026-11-20'::date, 200, 'f0e17000-0000-4000-8000-000000000001'::uuid, 'Rinku', 'From the diesel log sheet'),
  (4, 'f0e17000-0000-4000-8000-000000000104'::uuid, 'issue',      '2026-11-22'::date, 200, 'f0e17000-0000-4000-8000-000000000001'::uuid, 'Rinku', 'From the diesel log sheet'),
  (5, 'f0e17000-0000-4000-8000-000000000105'::uuid, 'issue',      '2026-11-22'::date, 20,  'f0e17000-0000-4000-8000-000000000002'::uuid, 'Yasir', 'From the diesel log sheet'),
  (6, 'f0e17000-0000-4000-8000-000000000106'::uuid, 'receipt',    '2026-11-22'::date, 600, NULL::uuid, NULL, 'From the diesel log sheet; rate not recorded'),
  (7, 'f0e17000-0000-4000-8000-000000000107'::uuid, 'issue',      '2026-11-22'::date, 200, 'f0e17000-0000-4000-8000-000000000004'::uuid, NULL, 'From the diesel log sheet ("Wani Sany")'),
  (8, 'f0e17000-0000-4000-8000-000000000108'::uuid, 'issue',      '2026-11-23'::date, 50,  'f0e17000-0000-4000-8000-000000000005'::uuid, NULL, 'From the diesel log sheet ("Roller Wani")'),
  (9, 'f0e17000-0000-4000-8000-000000000109'::uuid, 'issue',      '2026-11-23'::date, 50,  'f0e17000-0000-4000-8000-000000000002'::uuid, 'Yasir', 'From the diesel log sheet')
) AS e (n, id, entry_type, date, litres, machine_id, operator, remarks)
CROSS JOIN (SELECT id FROM projects WHERE id = '4a5176c7-0f53-42cc-bbd8-1a7259648a96') p
LEFT JOIN fuel_machines m ON m.id = e.machine_id
WHERE e.machine_id IS NULL OR m.id IS NOT NULL
ON CONFLICT (id) DO NOTHING;
