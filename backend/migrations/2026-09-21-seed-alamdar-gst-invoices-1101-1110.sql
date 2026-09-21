-- ==============================================================================
-- Migration: Seed Alamdar Stone Crusher GST Invoices #1101 to #1110
-- Material: 5,361 MT Bajari (HSN 251710) @ ₹750/MT + 5% GST
-- Vendor Statement of Account: 23/08/2026 - 31/08/2026
-- Opening Balance: ₹27,600.00 Dr
-- Debits (Invoices 1101 to 1110): ₹42,21,790.00
-- Closing Ledger Balance: ₹4,249,390.00 Dr
-- ==============================================================================

DO $$
DECLARE
  v_project_id UUID := '4a5176c7-0f53-42cc-bbd8-1a7259648a96';
  v_vendor_id UUID := 'b99e1d96-575d-4213-8d7d-a4be9808e355';
  v_po_id UUID := '1212da40-570e-4b11-9e23-786000000012';
  v_grn_id UUID := '1313da40-570e-4b11-9e23-786000000012';
  v_pr_id UUID := '1414da40-570e-4b11-9e23-786000000011';
BEGIN
  -- 0. Relabel internal CTSB measurement bill in expenses with distinct ID
  DELETE FROM expenses WHERE id::text LIKE '1111da40-570e-4b11-9e23-7860000011%';

  INSERT INTO expenses (
    id, project_id, vendor_id, date, description, category,
    bill_no, bill_date, gross_amount, gst_pct, gst_amount, cgst_amount, sgst_amount, igst_amount,
    gst_type, itc_claimed, tds_pct, tds_amount, net_payable, paid_amount, payment_mode,
    status, approved_by, remarks, created_at, updated_at
  ) VALUES (
    'c75b0000-570e-4b11-9e23-786000001101', v_project_id, v_vendor_id, '2026-08-31',
    'Alamdar Stone Crusher Bill #1101-CTSB (Site Delivery Register: 1,28,825 cft CTSB across 227 tippers)',
    'material', '1101-CTSB', '2026-08-29',
    3864750.00, 5.00, 193237.50, 96618.75, 96618.75, 0.00,
    'intrastate', true, 0.00, 0.00, 4057988.00, 0.00, 'RTGS',
    'approved', 'Accountant',
    'Site challan delivery register for 1,28,825 cft CTSB @ ₹30.00/cft + 5% GST = ₹40,57,988.00. Converted by vendor into GST Invoices #1101-#1110 (5,361 MT Bajari). RTGS to J&K Bank Khonmoh A/C 0244020100000164.',
    NOW(), NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    bill_no = EXCLUDED.bill_no,
    gross_amount = EXCLUDED.gross_amount,
    gst_amount = EXCLUDED.gst_amount,
    net_payable = EXCLUDED.net_payable,
    status = EXCLUDED.status,
    updated_at = NOW();

  UPDATE material_register
  SET invoice_no = '1101-CTSB / 1101-1110', updated_at = NOW()
  WHERE invoice_no = '1101' OR invoice_no = '1101-CTSB';

  -- 1. Insert 10 Official GST Invoices into expenses
  INSERT INTO expenses (
    id, project_id, vendor_id, date, description, category,
    bill_no, bill_date, gross_amount, gst_pct, gst_amount, cgst_amount, sgst_amount, igst_amount,
    gst_type, itc_claimed, tds_pct, tds_amount, net_payable, paid_amount, payment_mode,
    status, approved_by, remarks, created_at, updated_at
  ) VALUES
  ('a1a3da40-570e-4b11-9e23-786000001101', v_project_id, v_vendor_id, '2026-08-29', 'Alamdar Stone Crusher GST Invoice #1101 (208 MT Bajari @ ₹750/MT + 5% GST)', 'material', '1101', '2026-08-29', 156000.00, 5.00, 7800.00, 3900.00, 3900.00, 0.00, 'intrastate', true, 0.00, 0.00, 163800.00, 0.00, 'RTGS', 'approved', 'Accountant', 'GST Invoice #1101 dt 2026-08-29. 208 MT Bajari (HSN 251710) @ ₹750/MT + 5% GST. Part of Statement of Account (Aug 23 - Aug 31, 2026) Opening Dr ₹27,600.00, Closing Dr ₹4,249,390.00. RTGS to J&K Bank Khonmoh A/C 0244020100000164, IFSC JAKA0KHONMOH.', NOW(), NOW()),
  ('a1a3da40-570e-4b11-9e23-786000001102', v_project_id, v_vendor_id, '2026-08-29', 'Alamdar Stone Crusher GST Invoice #1102 (603 MT Bajari @ ₹750/MT + 5% GST)', 'material', '1102', '2026-08-29', 452250.00, 5.00, 22612.50, 11306.25, 11306.25, 0.00, 'intrastate', true, 0.00, 0.00, 474863.00, 0.00, 'RTGS', 'approved', 'Accountant', 'GST Invoice #1102 dt 2026-08-29. 603 MT Bajari (HSN 251710) @ ₹750/MT + 5% GST. Round off +₹0.50.', NOW(), NOW()),
  ('a1a3da40-570e-4b11-9e23-786000001103', v_project_id, v_vendor_id, '2026-08-29', 'Alamdar Stone Crusher GST Invoice #1103 (655 MT Bajari @ ₹750/MT + 5% GST)', 'material', '1103', '2026-08-29', 491250.00, 5.00, 24562.50, 12281.25, 12281.25, 0.00, 'intrastate', true, 0.00, 0.00, 515813.00, 0.00, 'RTGS', 'approved', 'Accountant', 'GST Invoice #1103 dt 2026-08-29. 655 MT Bajari (HSN 251710) @ ₹750/MT + 5% GST. Round off +₹0.50.', NOW(), NOW()),
  ('a1a3da40-570e-4b11-9e23-786000001104', v_project_id, v_vendor_id, '2026-08-29', 'Alamdar Stone Crusher GST Invoice #1104 (694 MT Bajari @ ₹750/MT + 5% GST)', 'material', '1104', '2026-08-29', 520500.00, 5.00, 26025.00, 13012.50, 13012.50, 0.00, 'intrastate', true, 0.00, 0.00, 546525.00, 0.00, 'RTGS', 'approved', 'Accountant', 'GST Invoice #1104 dt 2026-08-29. 694 MT Bajari (HSN 251710) @ ₹750/MT + 5% GST.', NOW(), NOW()),
  ('a1a3da40-570e-4b11-9e23-786000001105', v_project_id, v_vendor_id, '2026-08-29', 'Alamdar Stone Crusher GST Invoice #1105 (266 MT Bajari @ ₹750/MT + 5% GST)', 'material', '1105', '2026-08-29', 199500.00, 5.00, 9975.00, 4987.50, 4987.50, 0.00, 'intrastate', true, 0.00, 0.00, 209475.00, 0.00, 'RTGS', 'approved', 'Accountant', 'GST Invoice #1105 dt 2026-08-29. 266 MT Bajari (HSN 251710) @ ₹750/MT + 5% GST.', NOW(), NOW()),
  ('a1a3da40-570e-4b11-9e23-786000001106', v_project_id, v_vendor_id, '2026-08-30', 'Alamdar Stone Crusher GST Invoice #1106 (745 MT Bajari @ ₹750/MT + 5% GST)', 'material', '1106', '2026-08-30', 558750.00, 5.00, 27937.50, 13968.75, 13968.75, 0.00, 'intrastate', true, 0.00, 0.00, 586688.00, 0.00, 'RTGS', 'approved', 'Accountant', 'GST Invoice #1106 dt 2026-08-30. 745 MT Bajari (HSN 251710) @ ₹750/MT + 5% GST. Round off +₹0.50.', NOW(), NOW()),
  ('a1a3da40-570e-4b11-9e23-786000001107', v_project_id, v_vendor_id, '2026-08-30', 'Alamdar Stone Crusher GST Invoice #1107 (633 MT Bajari @ ₹750/MT + 5% GST)', 'material', '1107', '2026-08-30', 474750.00, 5.00, 23737.50, 11868.75, 11868.75, 0.00, 'intrastate', true, 0.00, 0.00, 498488.00, 0.00, 'RTGS', 'approved', 'Accountant', 'GST Invoice #1107 dt 2026-08-30. 633 MT Bajari (HSN 251710) @ ₹750/MT + 5% GST. Round off +₹0.50.', NOW(), NOW()),
  ('a1a3da40-570e-4b11-9e23-786000001108', v_project_id, v_vendor_id, '2026-08-31', 'Alamdar Stone Crusher GST Invoice #1108 (386 MT Bajari @ ₹750/MT + 5% GST)', 'material', '1108', '2026-08-31', 289500.00, 5.00, 14475.00, 7237.50, 7237.50, 0.00, 'intrastate', true, 0.00, 0.00, 303975.00, 0.00, 'RTGS', 'approved', 'Accountant', 'GST Invoice #1108 dt 2026-08-31. 386 MT Bajari (HSN 251710) @ ₹750/MT + 5% GST.', NOW(), NOW()),
  ('a1a3da40-570e-4b11-9e23-786000001109', v_project_id, v_vendor_id, '2026-08-31', 'Alamdar Stone Crusher GST Invoice #1109 (428 MT Bajari @ ₹750/MT + 5% GST)', 'material', '1109', '2026-08-31', 321000.00, 5.00, 16050.00, 8025.00, 8025.00, 0.00, 'intrastate', true, 0.00, 0.00, 337050.00, 0.00, 'RTGS', 'approved', 'Accountant', 'GST Invoice #1109 dt 2026-08-31. 428 MT Bajari (HSN 251710) @ ₹750/MT + 5% GST.', NOW(), NOW()),
  ('a1a3da40-570e-4b11-9e23-786000001110', v_project_id, v_vendor_id, '2026-08-31', 'Alamdar Stone Crusher GST Invoice #1110 (743 MT Bajari @ ₹750/MT + 5% GST)', 'material', '1110', '2026-08-31', 557250.00, 5.00, 27862.50, 13931.25, 13931.25, 0.00, 'intrastate', true, 0.00, 0.00, 585113.00, 0.00, 'RTGS', 'approved', 'Accountant', 'GST Invoice #1110 dt 2026-08-31. 743 MT Bajari (HSN 251710) @ ₹750/MT + 5% GST. Round off +₹0.50.', NOW(), NOW())
  ON CONFLICT (id) DO UPDATE SET
    bill_no = EXCLUDED.bill_no,
    gross_amount = EXCLUDED.gross_amount,
    gst_amount = EXCLUDED.gst_amount,
    cgst_amount = EXCLUDED.cgst_amount,
    sgst_amount = EXCLUDED.sgst_amount,
    net_payable = EXCLUDED.net_payable,
    description = EXCLUDED.description,
    remarks = EXCLUDED.remarks,
    status = EXCLUDED.status,
    updated_at = NOW();

  -- 2. Master Purchase Order: PO-KIPL-2026-0012
  INSERT INTO purchase_orders (
    id, project_id, po_number, order_date, po_date, expected_delivery_date,
    vendor_id, vendor_name, vendor_phone, vendor_email, vendor_gstin, vendor_address,
    subject, category, work_component, delivery_location, billing_address, shipping_address,
    payment_terms, delivery_terms, items,
    taxable_amount, cgst_amount, sgst_amount, igst_amount, total_tax,
    subtotal_amount, tax_amount, freight_charges, other_charges, grand_total, total_amount,
    status, created_by, approved_by, issued_by_name, approved_by_name,
    remarks, notes, created_at, updated_at
  ) VALUES (
    v_po_id, v_project_id, 'PO-KIPL-2026-0012', '2026-08-28', '2026-08-28', '2026-08-31',
    v_vendor_id, 'Alamdar Stone Crusher', '9797844511', 'allamdarstonecrusher786@gmail.com', '01ABMFA5025A1Z9', 'Wuyan Pampore-191102 Kashmir',
    'Supply of Bajari (5,361 MT) — Alamdar Stone Crusher (GST Invoices #1101 to #1110)',
    'aggregate_sand', 'Road Network & STP Site Development',
    '30 MLD STP Site, Gupt Ganga Ishbar Nishat, Srinagar',
    'M/s Khilari Infrastructure Pvt. Ltd., 30 MLD STP Ishbar Nishat Srinagar',
    '30 MLD STP Site, Gupt Ganga Ishbar Nishat, Srinagar',
    'Against verified GST Invoices & Ledger Statement', 'FOR Nishat STP Site',
    '[{"item_description": "Bajari (5,361 MT across GST Invoices #1101 to #1110)", "quantity": 5361, "unit": "MT", "unit_rate": 750.00, "gst_rate": 5.00, "taxable_amount": 4020750.00, "gst_amount": 201037.50, "total_amount": 4221790.00}]'::jsonb,
    4020750.00, 100518.75, 100518.75, 0.00, 201037.50,
    4020750.00, 201037.50, 0.00, 2.50, 4221790.00, 4221790.00,
    'completed', 'Procurement Head Office', 'Project Manager', 'Procurement Head Office', 'Project Manager',
    'Rate contract for Bajari @ ₹750.00/MT delivered to Nishat STP site against GST Invoices #1101 to #1110 (5,361 MT). Statement balance ₹4,249,390.00 Dr.',
    'Rate contract for Bajari @ ₹750.00/MT delivered to Nishat STP site against GST Invoices #1101 to #1110 (5,361 MT). Statement balance ₹4,249,390.00 Dr.',
    NOW(), NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    grand_total = EXCLUDED.grand_total,
    total_amount = EXCLUDED.total_amount,
    status = EXCLUDED.status,
    updated_at = NOW();

  -- 3. Goods Receipt Note: GRN-2026-0012
  INSERT INTO goods_receipt_notes (
    id, project_id, grn_number, purchase_order_id, received_date,
    challan_number, invoice_number, vehicle_number, received_by_name, remarks,
    write_to_material_register, created_at, updated_at
  ) VALUES (
    v_grn_id, v_project_id, 'GRN-2026-0012', v_po_id, '2026-08-31',
    'CH-ALM-1101-1110', '1101 to 1110',
    'Multiple Tippers (Site Weighment Batch)',
    'Shahid Khan (Site Incharge)',
    'Received 5,361 MT Bajari across 10 official GST Invoices (Bills #1101 through #1110) from Alamdar Stone Crusher at Nishat STP site.',
    true, NOW(), NOW()
  )
  ON CONFLICT (id) DO UPDATE SET updated_at = NOW();

  -- 4. Payment Requisition: PR-2026-0011
  INSERT INTO payment_requisitions (
    id, project_id, pr_number, title, pr_date, site_location, requested_by_name,
    status, total_order_cost, total_advance_paid, total_amount_to_pay, total_balance,
    procurement_status, procurement_approved_by_name, procurement_approved_at, procurement_remarks,
    accounts_status, accounts_approved_by_name, accounts_approved_at, accounts_remarks,
    notes, created_at, updated_at
  ) VALUES (
    v_pr_id, v_project_id, 'PR-2026-0011',
    'Payment Requisition for Bajari (5,361 MT) — Alamdar Stone Crusher (GST Invoices #1101 to #1110)',
    '2026-08-31', '30 MLD STP Ishbar Nishat', 'Shahid Khan (Site Incharge)',
    'approved', 4221790.00, 0.00, 4221790.00, 0.00,
    'approved', 'Project Manager', '2026-09-01 11:00:00+00',
    'Quantity 5,361 MT Bajari verified against official GST Invoices #1101 to #1110 and site weighment logs.',
    'approved', 'Accountant', '2026-09-01 16:00:00+00',
    'GST Invoices #1101 to #1110 verified. Total ₹42,21,790.00 (Taxable ₹40,20,750.00 + UTGST ₹1,00,518.75 + CGST ₹1,00,518.75 + Round off ₹2.50) passed. Vendor Statement of Account balance ₹4,249,390.00 Dr verified (including ₹27,600 opening balance). RTGS to J&K Bank Khonmoh A/C 0244020100000164, IFSC JAKA0KHONMOH.',
    'Payment against Alamdar Stone Crusher official GST Invoices #1101 to #1110 (Aug 29 - Aug 31, 2026).',
    NOW(), NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    total_amount_to_pay = EXCLUDED.total_amount_to_pay,
    total_order_cost = EXCLUDED.total_order_cost,
    status = EXCLUDED.status,
    updated_at = NOW();

END $$;
