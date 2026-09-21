-- Migration: Seed Alamdar Stone Crusher Bill No. 1101 (1,28,825 cft CTSB - ₹40,57,988.00)
-- Date: 2026-09-21

DO $$
DECLARE
  v_project_id UUID := '4a5176c7-0f53-42cc-bbd8-1a7259648a96';
  v_vendor_id UUID := 'b99e1d96-575d-4213-8d7d-a4be9808e355';
  v_po_id UUID := 'b2b4da40-570e-4b11-9e23-786000001101';
  v_grn_id UUID := 'd4d4da40-570e-4b11-9e23-786000001101';
  v_pr_id UUID := 'e5e4da40-570e-4b11-9e23-786000001101';
  v_exp_id UUID := '1111da40-570e-4b11-9e23-786000001101';
BEGIN
  -- 1. Purchase Order (PO-KIPL-2026-0011)
  INSERT INTO purchase_orders (
    id, project_id, po_number, po_date, order_date, expected_delivery_date,
    vendor_id, vendor_name, vendor_phone, vendor_email, vendor_gstin, vendor_address,
    subject, category, work_component, delivery_location, billing_address, shipping_address,
    payment_terms, delivery_terms, items,
    taxable_amount, cgst_amount, sgst_amount, igst_amount, total_tax,
    subtotal_amount, tax_amount, freight_charges, other_charges, grand_total, total_amount,
    status, created_by, approved_by, issued_by_name, approved_by_name, remarks, notes,
    created_at, updated_at
  ) VALUES (
    v_po_id, v_project_id, 'PO-KIPL-2026-0011', '2026-08-12', '2026-08-12', '2026-08-31',
    v_vendor_id, 'Alamdar Stone Crusher', '9797844511', 'allamdarstonecrusher786@gmail.com', '01ABMFA5025A1Z9', 'Wuyan Pampore-191102 Kashmir',
    'Supply of CTSB for Internal Road Network & Sub-Base at 30 MLD STP Nishat (1,28,825 cft / Bill #1101)',
    'aggregate_sand', 'Internal Road Network & Pavement Foundation',
    '30 MLD STP Site, Gupt Ganga Ishbar Nishat, Srinagar',
    'M/s Khilari Infrastructure Pvt. Ltd., 30 MLD STP Ishbar Nishat Srinagar',
    '30 MLD STP Site, Gupt Ganga Ishbar Nishat, Srinagar',
    'Against verified site delivery challans & bill', 'FOR Nishat STP Site',
    '[{"item_description": "CTSB (Crushed / Cement Treated Sub-Base)", "quantity": 128825, "unit": "cft", "unit_rate": 30.00, "gst_rate": 5.00, "taxable_amount": 3864750.00, "gst_amount": 193237.50, "total_amount": 4057988.00}]'::jsonb,
    3864750.00, 96618.75, 96618.75, 0.00, 193237.50,
    3864750.00, 193237.50, 0.00, 0.50, 4057988.00, 4057988.00,
    'completed', 'Procurement Head Office', 'Project Manager', 'Procurement Head Office', 'Project Manager',
    'Rate contract for CTSB @ ₹30.00/cft delivered to Nishat STP site against Bill #1101 (1,28,825 cft).',
    'Rate contract for CTSB @ ₹30.00/cft delivered to Nishat STP site against Bill #1101 (1,28,825 cft).',
    NOW(), NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    grand_total = EXCLUDED.grand_total,
    total_amount = EXCLUDED.total_amount,
    status = EXCLUDED.status,
    updated_at = NOW();

  DELETE FROM purchase_order_items WHERE purchase_order_id = v_po_id;
  INSERT INTO purchase_order_items (
    id, purchase_order_id, item_description, hsn_code, quantity, unit,
    unit_rate, discount_percent, gst_rate, taxable_amount, gst_amount, total_amount, received_qty,
    created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_po_id, 'CTSB (Crushed / Cement Treated Sub-Base)', '251710',
    128825.000, 'cft', 30.00, 0.00, 5.00, 3864750.00, 193237.50, 4057988.00, 128825.000,
    NOW(), NOW()
  );

  -- 2. Goods Receipt Note (GRN-2026-0011)
  INSERT INTO goods_receipt_notes (
    id, project_id, grn_number, purchase_order_id, received_date,
    challan_number, invoice_number, vehicle_number, received_by_name, remarks,
    write_to_material_register, created_at, updated_at
  ) VALUES (
    v_grn_id, v_project_id, 'GRN-2026-0011', v_po_id, '2026-08-31',
    'CH-ALM-1101', '1101',
    '1916, 1471, 1005, 8759, 0011, 0656, 2439, 5507, 9886, 8703, 0848, 9360, 9971, 5509, 9340, 7704, 0847, 0663, 7423',
    'Shahid Khan (Site Incharge)',
    'Received 1,28,825 cft CTSB across 13 pages of delivery vouchers from Alamdar Stone Crusher at Nishat STP site against Bill #1101.',
    true, NOW(), NOW()
  )
  ON CONFLICT (id) DO UPDATE SET updated_at = NOW();

  -- 3. Payment Requisition (PR-2026-0010)
  INSERT INTO payment_requisitions (
    id, project_id, pr_number, title, pr_date, site_location, requested_by_name,
    status, total_order_cost, total_advance_paid, total_amount_to_pay, total_balance,
    procurement_status, procurement_approved_by_name, procurement_approved_at, procurement_remarks,
    accounts_status, accounts_approved_by_name, accounts_approved_at, accounts_remarks,
    notes, created_at, updated_at
  ) VALUES (
    v_pr_id, v_project_id, 'PR-2026-0010',
    'Payment Requisition for CTSB (1,28,825 cft) — Alamdar Stone Crusher (Bill #1101)',
    '2026-08-31', '30 MLD STP Ishbar Nishat', 'Shahid Khan (Site Incharge)',
    'approved', 4057988.00, 0.00, 4057988.00, 0.00,
    'approved', 'Project Manager', '2026-09-01 10:00:00+00',
    'Quantity 1,28,825 cft CTSB verified across 13 pages of delivery vouchers at Nishat STP site.',
    'approved', 'Accountant', '2026-09-01 15:30:00+00',
    'Bill #1101 passed. Taxable ₹38,64,750.00 + SGST ₹96,618.75 + CGST ₹96,618.75 = ₹40,57,988.00 passed for RTGS to J&K Bank Khonmoh A/C 0244020100000164, IFSC JAKA0KHONMOH.',
    'Payment against Alamdar Stone Crusher Bill #1101 dated 29/08/2026.',
    NOW(), NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    total_amount_to_pay = EXCLUDED.total_amount_to_pay,
    total_order_cost = EXCLUDED.total_order_cost,
    status = EXCLUDED.status,
    updated_at = NOW();

  DELETE FROM payment_requisition_items WHERE payment_requisition_id = v_pr_id;
  INSERT INTO payment_requisition_items (
    id, payment_requisition_id, sr_no, vendor_id, vendor_name, description,
    material_or_services, is_msme, total_order_cost, advance_paid, amount_to_pay,
    balance_amount, site_location, remark, against_ref, mode_of_payment, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_pr_id, 1, v_vendor_id, 'Alamdar Stone Crusher',
    'Supply of 1,28,825 cft CTSB @ ₹30.00/cft + 5% GST for Nishat STP road network sub-base',
    'Material', true, 4057988.00, 0.00, 4057988.00, 0.00,
    '30 MLD STP Ishbar Nishat', 'Against Bill #1101 dt. 29/08/2026',
    'Bill #1101 (GRN-2026-0011)', 'RTGS', NOW(), NOW()
  );

  -- 4. Accounting Expense (Bill #1101)
  INSERT INTO expenses (
    id, project_id, vendor_id, date, description, category,
    bill_no, bill_date, gross_amount, gst_pct, gst_amount, cgst_amount, sgst_amount, igst_amount,
    gst_type, itc_claimed, tds_pct, tds_amount, net_payable, paid_amount, payment_mode,
    status, approved_by, remarks, created_at, updated_at
  ) VALUES (
    v_exp_id, v_project_id, v_vendor_id, '2026-08-31',
    'Alamdar Stone Crusher Bill #1101 (1,28,825 cft CTSB for 30 MLD STP Ishbar Nishat road network sub-base)',
    'material', '1101', '2026-08-29',
    3864750.00, 5.00, 193237.50, 96618.75, 96618.75, 0.00,
    'intrastate', true, 0.00, 0.00, 4057988.00, 0.00, 'RTGS',
    'approved', 'Accountant',
    'Verified against 13 pages of delivery vouchers (Total 1,28,825 cft CTSB @ ₹30.00/cft + 5% GST = ₹40,57,988.00). RTGS to J&K Bank Khonmoh A/C 0244020100000164.',
    NOW(), NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    gross_amount = EXCLUDED.gross_amount,
    gst_amount = EXCLUDED.gst_amount,
    net_payable = EXCLUDED.net_payable,
    status = EXCLUDED.status,
    updated_at = NOW();

END $$;
