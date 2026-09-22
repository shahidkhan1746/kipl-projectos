-- ============================================================
-- Migration: Seed Alamdar Stone Crusher Bill #005 Real Data
-- Integration: Vendors, PO, GRNs, Material Register, PR, Expenses, Site Diary
-- ============================================================

ALTER TABLE IF EXISTS goods_receipt_notes ALTER COLUMN vehicle_number TYPE VARCHAR(255);

DO $$
DECLARE
  v_proj_id UUID;
  v_vendor_id UUID := 'a1a3da40-570e-4b11-9e23-786000000005';
  v_po_id UUID := 'b2b4da40-570e-4b11-9e23-786000000005';
  v_po_item_1 UUID := 'c3c4da40-570e-4b11-9e23-786000000001';
  v_po_item_2 UUID := 'c3c4da40-570e-4b11-9e23-786000000002';
  v_grn_1 UUID := 'd4d4da40-570e-4b11-9e23-786000000001';
  v_grn_2 UUID := 'd4d4da40-570e-4b11-9e23-786000000002';
  v_pr_id UUID := 'e5e4da40-570e-4b11-9e23-786000000001';
  v_pr_item_1 UUID := 'f6f4da40-570e-4b11-9e23-786000000001';
  v_expense_id UUID := '1111da40-570e-4b11-9e23-786000000005';
BEGIN
  -- 1. Resolve Project ID
  SELECT id INTO v_proj_id FROM projects ORDER BY created_at ASC LIMIT 1;
  IF v_proj_id IS NULL THEN
    RAISE NOTICE 'No project found. Skipping seeding.';
    RETURN;
  END IF;

  -- 2. Master Dropdown Options
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'master_dropdown_options') THEN
    INSERT INTO master_dropdown_options (dropdown_type, label, value, display_order)
    VALUES ('unit', 'cft (Cubic Feet)', 'cft', 13)
    ON CONFLICT (dropdown_type, value) DO UPDATE SET label = EXCLUDED.label;

    INSERT INTO master_dropdown_options (dropdown_type, label, value, display_order)
    VALUES ('site_zone', 'Shalimar Site (SPS & Network)', 'Shalimar Site', 14)
    ON CONFLICT (dropdown_type, value) DO UPDATE SET label = EXCLUDED.label;

    INSERT INTO master_dropdown_options (dropdown_type, label, value, display_order)
    VALUES ('site_zone', '30 MLD STP Ishbar Nishat', '30 MLD STP Ishbar Nishat', 15)
    ON CONFLICT (dropdown_type, value) DO UPDATE SET label = EXCLUDED.label;

    INSERT INTO master_dropdown_options (dropdown_type, label, value, display_order, metadata)
    VALUES ('stakeholder', 'Alamdar Stone Crusher (Wuyan Pampore)', 'Alamdar Stone Crusher', 20, '{"category":"material_supplier", "phone":"9797844511"}'::jsonb)
    ON CONFLICT (dropdown_type, value) DO UPDATE SET label = EXCLUDED.label;

    INSERT INTO master_dropdown_options (dropdown_type, label, value, category, unit, spec, metadata, display_order)
    VALUES (
      'material', 'Khak Bajri', 'Khak Bajri', 'aggregate_sand', 'cft',
      'Crusher dust / fine stone dust for leveling, bedding and masonry',
      '{"aliases":["khakh bajari","khakh bajri","crusher dust","khaka bajri"]}'::jsonb, 10
    )
    ON CONFLICT (dropdown_type, value) DO UPDATE SET category = EXCLUDED.category, unit = EXCLUDED.unit;

    INSERT INTO master_dropdown_options (dropdown_type, label, value, category, unit, spec, metadata, display_order)
    VALUES (
      'material', 'Stone Dust / Crushed Sand', 'Stone Dust / Crushed Sand', 'aggregate_sand', 'cft',
      'Stone dust / screen dust / crushed sand for pipe bedding and masonry',
      '{"aliases":["dust screen","stone dust","screen dust"]}'::jsonb, 11
    )
    ON CONFLICT (dropdown_type, value) DO UPDATE SET category = EXCLUDED.category, unit = EXCLUDED.unit;
  END IF;

  -- 3. Vendor: Alamdar Stone Crusher
  INSERT INTO vendors (
    id, name, trade_name, category, gstin, pan, phone, email, address, bank_account, tds_applicable, tds_rate, is_active, project_id, created_at, updated_at
  ) VALUES (
    v_vendor_id,
    'Alamdar Stone Crusher',
    'Alamdar Stone Crusher',
    'material_supplier',
    '01ABMFA5025A1Z9',
    'ABMFA5025A',
    '9797844511',
    'allamdarstonecrusher786@gmail.com',
    'Wuyan Pampore-191102 Kashmir, 01-Jammu & Kashmir',
    '{"bank": "J&K Bank", "branch": "Khonmoh", "ifsc": "JAKA0KONMOH"}'::jsonb,
    true,
    2.00,
    true,
    v_proj_id::text,
    NOW(),
    NOW()
  ) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    trade_name = EXCLUDED.trade_name,
    gstin = EXCLUDED.gstin,
    pan = EXCLUDED.pan,
    phone = EXCLUDED.phone,
    email = EXCLUDED.email,
    address = EXCLUDED.address,
    bank_account = EXCLUDED.bank_account;

  -- 4. Purchase Order
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'purchase_orders') THEN
    INSERT INTO purchase_orders (
      id, project_id, po_number, po_date, order_date, vendor_id, vendor_name, subject, category, work_component,
      delivery_location, billing_address, shipping_address, expected_delivery_date,
      vendor_contact_person, vendor_phone, vendor_email, vendor_gstin, vendor_address,
      payment_terms, delivery_terms, items, subtotal_amount, tax_amount, freight_charges,
      other_charges, grand_total, total_amount, status, created_by, approved_by, issued_by_name, approved_by_name, notes,
      created_at, updated_at
    ) VALUES (
      v_po_id,
      v_proj_id,
      'PO-KIPL-2025-0004',
      '2025-12-20',
      '2025-12-20',
      v_vendor_id,
      'Alamdar Stone Crusher',
      'Supply of Khakh Bajari and Dust Screen for Shalimar SPS (Bill #005)',
      'aggregate_sand',
      'Sewer Pipeline Trenching, Bedding & Pipe Laying',
      'Shalimar SPS & Sewer Network Site, Srinagar, J&K',
      'M/s Khilari Infrastructure Pvt. Ltd., 30 MLD STP Ishbar Nishat Srinagar',
      'Shalimar SPS & Sewer Network Site, Srinagar, J&K',
      '2026-01-15',
      'Proprietor / Site Sales (9797844511)',
      '9797844511',
      'allamdarstonecrusher786@gmail.com',
      '01ABMFA5025A1Z9',
      'Wuyan Pampore-191102 Kashmir',
      '30 days against verified site delivery challans & bill',
      'FOR Shalimar Site, Srinagar',
      '[]'::jsonb,
      83500.00,
      0.00,
      0.00,
      0.00,
      83500.00,
      83500.00,
      'completed',
      'Procurement Head Office',
      'Project Manager',
      'Procurement Head Office',
      'Project Manager',
      'Rate contract for aggregate materials: Khakh Bajari @ ₹17.50/cft and Dust Screen @ ₹25.00/cft delivered to Shalimar site against Bill #005.',
      NOW(),
      NOW()
    ) ON CONFLICT (id) DO UPDATE SET
      vendor_id = EXCLUDED.vendor_id,
      grand_total = EXCLUDED.grand_total,
      total_amount = EXCLUDED.total_amount,
      status = EXCLUDED.status;

    -- PO Items
    INSERT INTO purchase_order_items (
      id, purchase_order_id, item_description, hsn_code, quantity, unit,
      unit_rate, discount_percent, gst_rate, taxable_amount, gst_amount, total_amount, received_qty,
      created_at, updated_at
    ) VALUES (
      v_po_item_1,
      v_po_id,
      'Khakh Bajari (Khak Bajri)',
      '2517',
      4200.000,
      'cft',
      17.50,
      0.00,
      0.00,
      73500.00,
      0.00,
      73500.00,
      4200.000,
      NOW(),
      NOW()
    ) ON CONFLICT (id) DO UPDATE SET
      quantity = EXCLUDED.quantity,
      received_qty = EXCLUDED.received_qty,
      total_amount = EXCLUDED.total_amount;

    INSERT INTO purchase_order_items (
      id, purchase_order_id, item_description, hsn_code, quantity, unit,
      unit_rate, discount_percent, gst_rate, taxable_amount, gst_amount, total_amount, received_qty,
      created_at, updated_at
    ) VALUES (
      v_po_item_2,
      v_po_id,
      'Dust Screen (Stone Dust)',
      '2517',
      400.000,
      'cft',
      25.00,
      0.00,
      0.00,
      10000.00,
      0.00,
      10000.00,
      400.000,
      NOW(),
      NOW()
    ) ON CONFLICT (id) DO UPDATE SET
      quantity = EXCLUDED.quantity,
      received_qty = EXCLUDED.received_qty,
      total_amount = EXCLUDED.total_amount;
  END IF;

  -- 5. Goods Receipt Notes (GRN)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goods_receipt_notes') THEN
    -- GRN 1 (2025-12-26) - 9 Tippers Khakh Bajari
    INSERT INTO goods_receipt_notes (
      id, project_id, grn_number, purchase_order_id, received_date,
      challan_number, invoice_number, vehicle_number, received_by_name, remarks,
      write_to_material_register, created_at, updated_at
    ) VALUES (
      v_grn_1,
      v_proj_id,
      'GRN-2025-0002',
      v_po_id,
      '2025-12-26',
      'CH-ALM-20251226',
      '005',
      '0656, 1916, 5507, 9360, 8759, 9971, 9340, 8703, 7704',
      'Shahid Khan (Site Incharge)',
      'Received 9 tippers (4,200 cft) Khakh Bajari from Alamdar Stone Crusher at Shalimar site for sewer trench bedding.',
      true,
      NOW(),
      NOW()
    ) ON CONFLICT (id) DO UPDATE SET
      received_date = EXCLUDED.received_date,
      invoice_number = EXCLUDED.invoice_number,
      vehicle_number = EXCLUDED.vehicle_number;

    INSERT INTO goods_receipt_note_items (
      grn_id, purchase_order_item_id, item_description, received_qty, unit, remarks, created_at, updated_at
    ) VALUES (
      v_grn_1,
      v_po_item_1,
      'Khakh Bajari (Khak Bajri)',
      4200.000,
      'cft',
      '9 tipper trips: 3 x 600 cft (#0656, #1916, #5507) + 6 x 400 cft (#9360, #8759, #9971, #9340, #8703, #7704)',
      NOW(),
      NOW()
    ) ON CONFLICT DO NOTHING;

    -- GRN 2 (2026-01-09) - 1 Tipper Dust Screen
    INSERT INTO goods_receipt_notes (
      id, project_id, grn_number, purchase_order_id, received_date,
      challan_number, invoice_number, vehicle_number, received_by_name, remarks,
      write_to_material_register, created_at, updated_at
    ) VALUES (
      v_grn_2,
      v_proj_id,
      'GRN-2026-0003',
      v_po_id,
      '2026-01-09',
      'CH-ALM-20260109',
      '005',
      '7704',
      'Shahid Khan (Site Incharge)',
      'Received 1 tipper (400 cft) Dust Screen from Alamdar Stone Crusher at Shalimar site for screen bedding.',
      true,
      NOW(),
      NOW()
    ) ON CONFLICT (id) DO UPDATE SET
      received_date = EXCLUDED.received_date,
      invoice_number = EXCLUDED.invoice_number,
      vehicle_number = EXCLUDED.vehicle_number;

    INSERT INTO goods_receipt_note_items (
      grn_id, purchase_order_item_id, item_description, received_qty, unit, remarks, created_at, updated_at
    ) VALUES (
      v_grn_2,
      v_po_item_2,
      'Dust Screen (Stone Dust)',
      400.000,
      'cft',
      '1 tipper trip: 400 cft (Tipper #7704) at Shalimar site',
      NOW(),
      NOW()
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- 6. Material Register (Clause 55 Site Register - 10 Granular Entries)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'material_register') THEN
    -- Delete previous seeded rows for this invoice if any to prevent duplicates
    DELETE FROM material_register WHERE remarks LIKE '%Alamdar Stone Crusher Bill #005%';

    -- 26/12/2025 Deliveries (9 tippers of Khak Bajri totaling 4,200 cft @ ₹17.50/cft = ₹73,500.00)
    INSERT INTO material_register (
      project_id, date, material, unit, received_qty, consumed_qty,
      rate, amount, purpose, challan_no, grn_id, wbs_code,
      contractor_rep, ueed_rep, remarks, vendor_id, supplier_name,
      invoice_no, po_number, vehicle_no, site_zone, qa_status, balance_stock,
      created_at, updated_at
    )
    VALUES
      (v_proj_id, '2025-12-26', 'Khak Bajri', 'cft', 600.000, 0.000, 17.50, 10500.00, 'Sewer pipeline trenching, bedding and pipe laying at Shalimar site', 'CH-ALM-20251226', v_grn_1, 'WBS-SHAL-SEW', 'Shahid Khan (Site Incharge)', 'Er. Samiullah Beigh / AEE S&D-I', 'Tipper #0656 (600 cft) — Alamdar Stone Crusher Bill #005 — Shalimar site sewer bedding', v_vendor_id, 'Alamdar Stone Crusher', '005', 'PO-KIPL-2025-0004', '0656', 'Shalimar Site', 'verified', 0.00, NOW(), NOW()),
      (v_proj_id, '2025-12-26', 'Khak Bajri', 'cft', 600.000, 0.000, 17.50, 10500.00, 'Sewer pipeline trenching, bedding and pipe laying at Shalimar site', 'CH-ALM-20251226', v_grn_1, 'WBS-SHAL-SEW', 'Shahid Khan (Site Incharge)', 'Er. Samiullah Beigh / AEE S&D-I', 'Tipper #1916 (600 cft) — Alamdar Stone Crusher Bill #005 — Shalimar site sewer bedding', v_vendor_id, 'Alamdar Stone Crusher', '005', 'PO-KIPL-2025-0004', '1916', 'Shalimar Site', 'verified', 0.00, NOW(), NOW()),
      (v_proj_id, '2025-12-26', 'Khak Bajri', 'cft', 600.000, 0.000, 17.50, 10500.00, 'Sewer pipeline trenching, bedding and pipe laying at Shalimar site', 'CH-ALM-20251226', v_grn_1, 'WBS-SHAL-SEW', 'Shahid Khan (Site Incharge)', 'Er. Samiullah Beigh / AEE S&D-I', 'Tipper #5507 (600 cft) — Alamdar Stone Crusher Bill #005 — Shalimar site sewer bedding', v_vendor_id, 'Alamdar Stone Crusher', '005', 'PO-KIPL-2025-0004', '5507', 'Shalimar Site', 'verified', 0.00, NOW(), NOW()),
      (v_proj_id, '2025-12-26', 'Khak Bajri', 'cft', 400.000, 0.000, 17.50, 7000.00, 'Sewer pipeline trenching, bedding and pipe laying at Shalimar site', 'CH-ALM-20251226', v_grn_1, 'WBS-SHAL-SEW', 'Shahid Khan (Site Incharge)', 'Er. Samiullah Beigh / AEE S&D-I', 'Tipper #9360 (400 cft) — Alamdar Stone Crusher Bill #005 — Shalimar site sewer bedding', v_vendor_id, 'Alamdar Stone Crusher', '005', 'PO-KIPL-2025-0004', '9360', 'Shalimar Site', 'verified', 0.00, NOW(), NOW()),
      (v_proj_id, '2025-12-26', 'Khak Bajri', 'cft', 400.000, 0.000, 17.50, 7000.00, 'Sewer pipeline trenching, bedding and pipe laying at Shalimar site', 'CH-ALM-20251226', v_grn_1, 'WBS-SHAL-SEW', 'Shahid Khan (Site Incharge)', 'Er. Samiullah Beigh / AEE S&D-I', 'Tipper #8759 (400 cft) — Alamdar Stone Crusher Bill #005 — Shalimar site sewer bedding', v_vendor_id, 'Alamdar Stone Crusher', '005', 'PO-KIPL-2025-0004', '8759', 'Shalimar Site', 'verified', 0.00, NOW(), NOW()),
      (v_proj_id, '2025-12-26', 'Khak Bajri', 'cft', 400.000, 0.000, 17.50, 7000.00, 'Sewer pipeline trenching, bedding and pipe laying at Shalimar site', 'CH-ALM-20251226', v_grn_1, 'WBS-SHAL-SEW', 'Shahid Khan (Site Incharge)', 'Er. Samiullah Beigh / AEE S&D-I', 'Tipper #9971 (400 cft) — Alamdar Stone Crusher Bill #005 — Shalimar site sewer bedding', v_vendor_id, 'Alamdar Stone Crusher', '005', 'PO-KIPL-2025-0004', '9971', 'Shalimar Site', 'verified', 0.00, NOW(), NOW()),
      (v_proj_id, '2025-12-26', 'Khak Bajri', 'cft', 400.000, 0.000, 17.50, 7000.00, 'Sewer pipeline trenching, bedding and pipe laying at Shalimar site', 'CH-ALM-20251226', v_grn_1, 'WBS-SHAL-SEW', 'Shahid Khan (Site Incharge)', 'Er. Samiullah Beigh / AEE S&D-I', 'Tipper #9340 (400 cft) — Alamdar Stone Crusher Bill #005 — Shalimar site sewer bedding', v_vendor_id, 'Alamdar Stone Crusher', '005', 'PO-KIPL-2025-0004', '9340', 'Shalimar Site', 'verified', 0.00, NOW(), NOW()),
      (v_proj_id, '2025-12-26', 'Khak Bajri', 'cft', 400.000, 0.000, 17.50, 7000.00, 'Sewer pipeline trenching, bedding and pipe laying at Shalimar site', 'CH-ALM-20251226', v_grn_1, 'WBS-SHAL-SEW', 'Shahid Khan (Site Incharge)', 'Er. Samiullah Beigh / AEE S&D-I', 'Tipper #8703 (400 cft) — Alamdar Stone Crusher Bill #005 — Shalimar site sewer bedding', v_vendor_id, 'Alamdar Stone Crusher', '005', 'PO-KIPL-2025-0004', '8703', 'Shalimar Site', 'verified', 0.00, NOW(), NOW()),
      (v_proj_id, '2025-12-26', 'Khak Bajri', 'cft', 400.000, 0.000, 17.50, 7000.00, 'Sewer pipeline trenching, bedding and pipe laying at Shalimar site', 'CH-ALM-20251226', v_grn_1, 'WBS-SHAL-SEW', 'Shahid Khan (Site Incharge)', 'Er. Samiullah Beigh / AEE S&D-I', 'Tipper #7704 (400 cft) — Alamdar Stone Crusher Bill #005 — Shalimar site sewer bedding', v_vendor_id, 'Alamdar Stone Crusher', '005', 'PO-KIPL-2025-0004', '7704', 'Shalimar Site', 'verified', 0.00, NOW(), NOW());

    -- 09/01/2026 Delivery (1 tipper of Stone Dust / Crushed Sand totaling 400 cft @ ₹25.00/cft = ₹10,000.00)
    INSERT INTO material_register (
      project_id, date, material, unit, received_qty, consumed_qty,
      rate, amount, purpose, challan_no, grn_id, wbs_code,
      contractor_rep, ueed_rep, remarks, vendor_id, supplier_name,
      invoice_no, po_number, vehicle_no, site_zone, qa_status, balance_stock,
      created_at, updated_at
    )
    VALUES
      (v_proj_id, '2026-01-09', 'Stone Dust / Crushed Sand', 'cft', 400.000, 0.000, 25.00, 10000.00, 'Sewer pipe joint encasement, screen bedding and backfilling at Shalimar site', 'CH-ALM-20260109', v_grn_2, 'WBS-SHAL-SEW', 'Shahid Khan (Site Incharge)', 'Er. Samiullah Beigh / AEE S&D-I', 'Tipper #7704 (400 cft) — Alamdar Stone Crusher Bill #005 — Shalimar site screen bedding', v_vendor_id, 'Alamdar Stone Crusher', '005', 'PO-KIPL-2025-0004', '7704', 'Shalimar Site', 'verified', 0.00, NOW(), NOW());
  END IF;

  -- 7. Payment Requisition (Official KIPL 13-Column Proforma)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_requisitions') THEN
    INSERT INTO payment_requisitions (
      id, project_id, pr_number, title, pr_date, site_location, requested_by_name,
      status, total_order_cost, total_advance_paid, total_amount_to_pay, total_balance,
      procurement_status, procurement_approved_by_name, procurement_approved_at, procurement_remarks,
      accounts_status, accounts_approved_by_name, accounts_approved_at, accounts_remarks,
      notes, created_at, updated_at
    ) VALUES (
      v_pr_id,
      v_proj_id,
      'PR-2026-0002',
      'Payment Requisition for Aggregates & Stone Dust — Alamdar Stone Crusher (Bill #005)',
      '2026-01-10',
      'Shalimar / 30 MLD STP Ishbar Nishat',
      'Shahid Khan (Site Incharge)',
      'approved',
      83500.00,
      0.00,
      83500.00,
      0.00,
      'approved',
      'Project Manager',
      '2026-01-11 10:30:00+00',
      'Quantity verified against 10 tipper delivery challans & site measurement at Shalimar. Recommended for payment.',
      'approved',
      'Accountant',
      '2026-01-11 14:15:00+00',
      'Bill #005 verified. GST 0%. Bank details matched with vendor master (J&K Bank Khonmoh JAKA0KONMOH). Passed for RTGS.',
      'Payment against Alamdar Stone Crusher Bill #005 dated 10/01/2026. Deliveries on 26/12/2025 and 09/01/2026.',
      NOW(),
      NOW()
    ) ON CONFLICT (id) DO UPDATE SET
      total_amount_to_pay = EXCLUDED.total_amount_to_pay,
      status = EXCLUDED.status;

    INSERT INTO payment_requisition_items (
      id, payment_requisition_id, sr_no, vendor_id, vendor_name, description,
      material_or_services, is_msme, total_order_cost, advance_paid, amount_to_pay,
      balance_amount, site_location, remark, against_ref, mode_of_payment, created_at, updated_at
    ) VALUES (
      v_pr_item_1,
      v_pr_id,
      1,
      v_vendor_id,
      'Alamdar Stone Crusher',
      'Supply of Khakh Bajari (4,200 cft @ 17.50) & Dust Screen (400 cft @ 25.00) for Shalimar site trench bedding',
      'Material',
      true,
      83500.00,
      0.00,
      83500.00,
      0.00,
      'Shalimar / 30 MLD STP Ishbar Nishat',
      'Against Tax Invoice Bill #005 dt. 10/01/2026',
      'Bill #005 (GRN-2025-0002 & GRN-2026-0003)',
      'RTGS',
      NOW(),
      NOW()
    ) ON CONFLICT (id) DO UPDATE SET
      amount_to_pay = EXCLUDED.amount_to_pay,
      balance_amount = EXCLUDED.balance_amount;
  END IF;

  -- 8. Expenses / Vendor Bill (Accounting Module)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expenses') THEN
    INSERT INTO expenses (
      id, project_id, vendor_id, date, description, category,
      bill_no, bill_date, gross_amount, gst_pct, gst_amount,
      tds_pct, tds_amount, net_payable, paid_amount, payment_mode,
      status, approved_by, remarks, created_at, updated_at
    ) VALUES (
      v_expense_id,
      v_proj_id::text,
      v_vendor_id::text,
      '2026-01-10',
      'Material supply: 4,200 cft Khakh Bajari + 400 cft Dust Screen for Shalimar SPS & sewer network bedding (Bill #005)',
      'material',
      '005',
      '2026-01-10',
      83500.00,
      0.00,
      0.00,
      0.00,
      0.00,
      83500.00,
      0.00,
      'RTGS',
      'approved',
      'Accountant',
      '10 tipper trips verified at Shalimar site. RTGS to J&K Bank Khonmoh A/C (IFSC: JAKA0KONMOH).',
      NOW(),
      NOW()
    ) ON CONFLICT (id) DO UPDATE SET
      gross_amount = EXCLUDED.gross_amount,
      net_payable = EXCLUDED.net_payable,
      status = EXCLUDED.status;
  END IF;

  -- 9. Site Diaries (Date-Wise Material Integration)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'site_diaries') THEN
    -- Diary for 2025-12-26
    IF EXISTS (SELECT 1 FROM site_diaries WHERE project_id = v_proj_id::text AND date = '2025-12-26') THEN
      UPDATE site_diaries
      SET materials_received = jsonb_build_array(
        jsonb_build_object(
          'material', 'Khak Bajri (Khakh Bajari)',
          'quantity', 4200,
          'unit', 'cft',
          'supplier', 'Alamdar Stone Crusher (Bill #005, 9 Tippers)'
        )
      ),
      work_done = jsonb_build_array(
        jsonb_build_object(
          'zone', 'Shalimar Site (SPS & Network)',
          'activity', 'Sewer trench excavation, NP3 pipe laying and granular bedding',
          'quantity', 180,
          'unit', 'Rmt',
          'remarks', '9 tippers (4,200 cft) Khakh Bajari laid as pipe surround & bedding'
        )
      ),
      updated_at = NOW()
      WHERE project_id = v_proj_id::text AND date = '2025-12-26';
    ELSE
      INSERT INTO site_diaries (
        id, project_id, date, submitted_by, weather_morning, weather_afternoon,
        temp_min, temp_max, rainfall_mm, work_stopped_weather, hours_lost,
        labour_skilled, labour_unskilled, labour_supervisory, labour_total,
        equipment, work_done, materials_received, visitors, issues_faced,
        instructions_given, next_day_plan, eot_claim, status, created_at, updated_at
      ) VALUES (
        gen_random_uuid(),
        v_proj_id::text,
        '2025-12-26',
        'Shahid Khan (Site Incharge)',
        'cloudy',
        'cloudy',
        -1.5,
        7.0,
        0,
        false,
        0,
        4, 12, 2, 18,
        '[{"type": "JCB / Backhoe", "count": 1, "hours": 8, "remarks": "Trench excavation at Shalimar"}, {"type": "Tipper/Dumper", "count": 9, "hours": 12, "remarks": "Aggregate unloading"}]'::jsonb,
        '[{"zone": "Shalimar Site (SPS & Network)", "activity": "Sewer trench excavation, NP3 pipe laying and granular bedding", "quantity": 180, "unit": "Rmt", "remarks": "9 tippers (4,200 cft) Khakh Bajari laid as pipe surround & bedding"}]'::jsonb,
        '[{"material": "Khak Bajri (Khakh Bajari)", "quantity": 4200, "unit": "cft", "supplier": "Alamdar Stone Crusher (Bill #005, 9 Tippers)"}]'::jsonb,
        '[]'::jsonb,
        'Cold weather conditions in morning. Dewatering active at low points.',
        'Ensure proper compaction of Khakh Bajari bedding under RCC NP3 pipes before jointing.',
        'Continue pipe laying towards node 105 and backfill completed stretches.',
        false,
        'approved',
        NOW(),
        NOW()
      );
    END IF;

    -- Diary for 2026-01-09
    IF EXISTS (SELECT 1 FROM site_diaries WHERE project_id = v_proj_id::text AND date = '2026-01-09') THEN
      UPDATE site_diaries
      SET materials_received = jsonb_build_array(
        jsonb_build_object(
          'material', 'Stone Dust / Dust Screen',
          'quantity', 400,
          'unit', 'cft',
          'supplier', 'Alamdar Stone Crusher (Bill #005, Tipper #7704)'
        )
      ),
      work_done = jsonb_build_array(
        jsonb_build_object(
          'zone', 'Shalimar Site (SPS & Network)',
          'activity', 'Sewer pipe joint encasement, screen bedding and backfilling',
          'quantity', 45,
          'unit', 'Rmt',
          'remarks', '1 tipper (400 cft) Dust Screen used for bedding & encasement'
        )
      ),
      updated_at = NOW()
      WHERE project_id = v_proj_id::text AND date = '2026-01-09';
    ELSE
      INSERT INTO site_diaries (
        id, project_id, date, submitted_by, weather_morning, weather_afternoon,
        temp_min, temp_max, rainfall_mm, work_stopped_weather, hours_lost,
        labour_skilled, labour_unskilled, labour_supervisory, labour_total,
        equipment, work_done, materials_received, visitors, issues_faced,
        instructions_given, next_day_plan, eot_claim, status, created_at, updated_at
      ) VALUES (
        gen_random_uuid(),
        v_proj_id::text,
        '2026-01-09',
        'Shahid Khan (Site Incharge)',
        'sunny',
        'cloudy',
        -2.0,
        8.5,
        0,
        false,
        0,
        3, 8, 1, 12,
        '[{"type": "Compactor", "count": 1, "hours": 6, "remarks": "Compacting trench bedding"}, {"type": "Tipper/Dumper", "count": 1, "hours": 2, "remarks": "Dust screen delivery"}]'::jsonb,
        '[{"zone": "Shalimar Site (SPS & Network)", "activity": "Sewer pipe joint encasement, screen bedding and backfilling", "quantity": 45, "unit": "Rmt", "remarks": "1 tipper (400 cft) Dust Screen used for bedding & encasement"}]'::jsonb,
        '[{"material": "Stone Dust / Dust Screen", "quantity": 400, "unit": "cft", "supplier": "Alamdar Stone Crusher (Bill #005, Tipper #7704)"}]'::jsonb,
        '[]'::jsonb,
        'Sub-zero morning frost. Work resumed at 10:00 AM after ground thawed.',
        'Verify level of Dust Screen bedding prior to pipe placement.',
        'Complete hydrostatic testing on 45m section.',
        false,
        'approved',
        NOW(),
        NOW()
      );
    END IF;
  END IF;

  RAISE NOTICE 'Successfully seeded Alamdar Stone Crusher Bill #005 into all modules.';
END $$;
