-- Hazratbal Filling Station's account for the Dal Lake site, from the pump's
-- account sheet (HFS_Accounts.xlsx, 19 Oct to 25 Nov 2026):
--
--   paid in     1,00,000 (19 Oct) + 1,00,000 (17 Nov) + 36,229 + 5,00,000 (25 Nov) = 7,36,229
--   diesel      3,050 L at Rs 96.42                                                  = 2,94,081
--   advance left                                                                      = 4,42,148
--
-- What goes where:
--   * The pump, at Rs 96.42 a litre, as the site's default supplier.
--   * The four payments. The 25 Nov 5,00,000 went by NEFT, ref 814629437, as the
--     bank's confirmation shows (the sheet calls it RTGS).
--   * Deliveries from 19 Oct to 17 Nov (1,450 L) count against the advance
--     only. They came before the stock register began on 20 Nov, and nobody
--     recorded which machines used them, so they stay out of the stock.
--   * The register's 20 Nov 400 L and 22 Nov 600 L purchases are the sheet's
--     V.No 2109 and 2110. They are paid from the advance and get the receipt
--     number; the sheet's rate goes in only where nobody has entered a price.
--   * The 25 Nov 600 L (V.No 2111, receipt 4782) was not in the register. If
--     someone entered it in the app since, that entry is linked to the pump
--     instead of a second one being added.
--
-- Runs on every boot and is a no-op after the first: fixed ids, and updates
-- only touch rows nobody has priced. Does nothing unless the project exists.

INSERT INTO fuel_suppliers (id, project_id, name, rate, is_default, active, created_at, updated_at)
SELECT 'f0e17000-0000-4000-8000-000000000201'::uuid, p.id::text, 'Hazratbal Filling Station', 96.42, true, true, now(), now()
FROM projects p
WHERE p.id = '4a5176c7-0f53-42cc-bbd8-1a7259648a96'
  AND NOT EXISTS (SELECT 1 FROM fuel_suppliers s WHERE s.project_id = p.id::text AND s.is_default)
ON CONFLICT (id) DO NOTHING;

-- Payments and pre-register deliveries. created_at keeps the sheet's order
-- within a day (UTC; the site is 5.5 hours ahead).
INSERT INTO fuel_supplier_entries (id, project_id, supplier_id, entry_type, date, amount, litres, rate, mode, reference, remarks, recorded_by_name, created_at, updated_at)
SELECT e.id, s.project_id, s.id, e.entry_type, e.date, e.amount, e.litres, e.rate, e.mode, e.reference, e.remarks,
       'Imported from the HFS account sheet', e.at, e.at
FROM (VALUES
  ('f0e17000-0000-4000-8000-000000000301'::uuid, 'payment', '2026-10-19'::date, 100000.00, NULL::numeric, NULL::numeric, NULL, '000081', 'Advance payment', '2026-10-19 04:00:01'::timestamp),
  ('f0e17000-0000-4000-8000-000000000302'::uuid, 'lift',    '2026-10-19'::date,  19284.00, 200, 96.42, NULL, '4693', 'Before the stock register (V.No 2101)', '2026-10-19 04:00:02'::timestamp),
  ('f0e17000-0000-4000-8000-000000000303'::uuid, 'lift',    '2026-10-23'::date,  19284.00, 200, 96.42, NULL, '4725', 'Before the stock register (V.No 2102)', '2026-10-23 04:00:01'::timestamp),
  ('f0e17000-0000-4000-8000-000000000304'::uuid, 'lift',    '2026-10-28'::date,  19284.00, 200, 96.42, NULL, '4735', 'Before the stock register (V.No 2103)', '2026-10-28 04:00:01'::timestamp),
  ('f0e17000-0000-4000-8000-000000000305'::uuid, 'lift',    '2026-10-31'::date,  19284.00, 200, 96.42, NULL, '4753', 'Before the stock register (V.No 2104)', '2026-10-31 04:00:01'::timestamp),
  ('f0e17000-0000-4000-8000-000000000306'::uuid, 'lift',    '2026-11-04'::date,  19284.00, 200, 96.42, NULL, '4778', 'Before the stock register (V.No 2105)', '2026-11-04 04:00:01'::timestamp),
  ('f0e17000-0000-4000-8000-000000000307'::uuid, 'lift',    '2026-11-11'::date,  19284.00, 200, 96.42, NULL, '4775', 'Before the stock register (V.No 2106)', '2026-11-11 04:00:01'::timestamp),
  ('f0e17000-0000-4000-8000-000000000308'::uuid, 'lift',    '2026-11-11'::date,   4821.00,  50, 96.42, NULL, '4776', 'Before the stock register (V.No 2107)', '2026-11-11 04:00:02'::timestamp),
  ('f0e17000-0000-4000-8000-000000000309'::uuid, 'payment', '2026-11-17'::date, 100000.00, NULL, NULL, NULL, NULL, 'Advance payment (no reference on the sheet)', '2026-11-17 04:00:01'::timestamp),
  ('f0e17000-0000-4000-8000-000000000310'::uuid, 'lift',    '2026-11-17'::date,  19284.00, 200, 96.42, NULL, '4637', 'Before the stock register (V.No 2108)', '2026-11-17 04:00:02'::timestamp),
  ('f0e17000-0000-4000-8000-000000000311'::uuid, 'payment', '2026-11-25'::date,  36229.00, NULL, NULL, NULL, '000091', 'Clearing the 36,229 the pump had given on credit', '2026-11-25 04:00:01'::timestamp),
  ('f0e17000-0000-4000-8000-000000000312'::uuid, 'payment', '2026-11-25'::date, 500000.00, NULL, NULL, 'NEFT', '814629437', 'Advance payment, vendor payment Dal Lake. The bank shows NEFT; the sheet says RTGS.', '2026-11-25 11:00:00'::timestamp)
) AS e (id, entry_type, date, amount, litres, rate, mode, reference, remarks, at)
JOIN fuel_suppliers s ON s.id = 'f0e17000-0000-4000-8000-000000000201'::uuid
ON CONFLICT (id) DO NOTHING;

-- The register's own purchases of 20 and 22 Nov: paid from the advance, and
-- priced at the sheet's rate unless someone has already entered a price.
UPDATE fuel_entries f
SET supplier_id = s.id, supplier = s.name,
    rate = COALESCE(f.rate, CASE WHEN f.amount IS NULL THEN 96.42 ELSE round(f.amount / f.litres, 2) END),
    amount = COALESCE(f.amount, round(f.litres * COALESCE(f.rate, 96.42), 2)),
    bill_no = COALESCE(f.bill_no, x.bill_no),
    remarks = CASE WHEN f.rate IS NULL AND f.amount IS NULL
                   THEN 'From the diesel log sheet; priced from the HFS account (' || x.slip || ')'
                   ELSE f.remarks END,
    updated_at = now()
FROM (VALUES
  ('f0e17000-0000-4000-8000-000000000102'::uuid, NULL, 'V.No 2109, no receipt number on the sheet'),
  ('f0e17000-0000-4000-8000-000000000106'::uuid, '4649', 'V.No 2110')
) AS x (id, bill_no, slip),
fuel_suppliers s
WHERE f.id = x.id AND s.id = 'f0e17000-0000-4000-8000-000000000201'::uuid
  AND f.voided_at IS NULL AND f.supplier_id IS NULL;

-- 25 Nov, 600 L. If it was entered in the app since the sheet import, link that entry.
UPDATE fuel_entries f
SET supplier_id = s.id, supplier = s.name,
    rate = COALESCE(f.rate, CASE WHEN f.amount IS NULL THEN 96.42 ELSE round(f.amount / f.litres, 2) END),
    amount = COALESCE(f.amount, round(f.litres * COALESCE(f.rate, 96.42), 2)),
    bill_no = COALESCE(f.bill_no, '4782'), updated_at = now()
FROM fuel_suppliers s
WHERE s.id = 'f0e17000-0000-4000-8000-000000000201'::uuid
  AND NOT EXISTS (SELECT 1 FROM fuel_entries WHERE id = 'f0e17000-0000-4000-8000-000000000110'::uuid)
  AND f.id = (
    SELECT id FROM fuel_entries
    WHERE project_id = s.project_id AND entry_type = 'receipt' AND fuel_type = 'diesel' AND voided_at IS NULL
      AND supplier_id IS NULL AND litres = 600 AND date BETWEEN '2026-11-25' AND '2026-11-26'
    ORDER BY date, created_at LIMIT 1);

-- Otherwise add it.
INSERT INTO fuel_entries (id, project_id, entry_type, fuel_type, date, litres, rate, amount, supplier, supplier_id, bill_no, remarks, recorded_by_name, created_at, updated_at)
SELECT 'f0e17000-0000-4000-8000-000000000110'::uuid, s.project_id, 'receipt', 'diesel', '2026-11-25'::date, 600, 96.42, 57852.00,
       s.name, s.id, '4782', 'From the HFS account sheet (V.No 2111)', 'Imported from the HFS account sheet',
       '2026-11-25 06:00:00'::timestamp, '2026-11-25 06:00:00'::timestamp
FROM fuel_suppliers s
WHERE s.id = 'f0e17000-0000-4000-8000-000000000201'::uuid
  AND NOT EXISTS (
    SELECT 1 FROM fuel_entries
    WHERE project_id = s.project_id AND entry_type = 'receipt' AND fuel_type = 'diesel' AND voided_at IS NULL
      AND litres = 600 AND date BETWEEN '2026-11-25' AND '2026-11-26'
      AND id <> 'f0e17000-0000-4000-8000-000000000110'::uuid)
ON CONFLICT (id) DO NOTHING;
