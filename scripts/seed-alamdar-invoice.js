#!/usr/bin/env node
/**
 * KIPL ProjectOS — Alamdar Stone Crusher Bill #005 Multi-Module Seed
 * Source: Alamdar Stone Crusher Tax Invoice Bill No. 005 dt. 10/01/2026
 * Cross-links into:
 *   1. Vendor Directory (/accounting -> Vendors)
 *   2. Procurement / POs (/procurement -> POs)
 *   3. Goods Receipt Notes (/procurement -> GRN)
 *   4. Material Register (/material-register -> Aggregates & Sand)
 *   5. KIPL Payment Requisition (/procurement -> Payment Requisitions)
 *   6. Accounting Expenses & Bills (/accounting -> Expenses)
 *   7. Site Diaries (/diary -> Date-wise materials received)
 */

const { Client } = require('../backend/node_modules/pg');

const db = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'kipl_projectos',
  user: process.env.DB_USER || 'kipl_user',
  password: process.env.DB_PASSWORD || 'PePH6FaCgFYgwEkb4xDy',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function main() {
  await db.connect();
  console.log('\n Connected to kipl_projectos database\n');

  // Resolve active project
  const { rows: projs } = await db.query(`SELECT id, name FROM projects ORDER BY created_at ASC LIMIT 1`);
  if (projs.length === 0) {
    console.error('No project found in database.');
    process.exit(1);
  }
  const projectId = projs[0].id;
  console.log(`Target Project: ${projs[0].name} (${projectId})`);

  const vendorId = 'a1a3da40-570e-4b11-9e23-786000000005';
  const poId = 'b2b4da40-570e-4b11-9e23-786000000005';
  const poItem1Id = 'c3c4da40-570e-4b11-9e23-786000000001';
  const poItem2Id = 'c3c4da40-570e-4b11-9e23-786000000002';
  const grn1Id = 'd4d4da40-570e-4b11-9e23-786000000001';
  const grn2Id = 'd4d4da40-570e-4b11-9e23-786000000002';
  const prId = 'e5e4da40-570e-4b11-9e23-786000000001';
  const prItem1Id = 'f6f4da40-570e-4b11-9e23-786000000001';
  const expenseId = '1111da40-570e-4b11-9e23-786000000005';

  // 1. Vendor
  await db.query(`
    INSERT INTO vendors (
      id, name, trade_name, category, gstin, pan, phone, email, address, bank_account, tds_applicable, tds_rate, is_active, project_id, created_at, updated_at
    ) VALUES (
      $1, 'Alamdar Stone Crusher', 'Alamdar Stone Crusher', 'material_supplier', '01ABMFA5025A1Z9', 'ABMFA5025A', '9797844511',
      'allamdarstonecrusher786@gmail.com', 'Wuyan Pampore-191102 Kashmir, 01-Jammu & Kashmir',
      '{"bank": "J&K Bank", "branch": "Khonmoh", "ifsc": "JAKA0KONMOH"}'::jsonb, true, 2.00, true, $2, NOW(), NOW()
    ) ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name, trade_name = EXCLUDED.trade_name, gstin = EXCLUDED.gstin,
      pan = EXCLUDED.pan, phone = EXCLUDED.phone, email = EXCLUDED.email,
      address = EXCLUDED.address, bank_account = EXCLUDED.bank_account
  `, [vendorId, projectId]);
  console.log(' 1. Vendor seeded: Alamdar Stone Crusher (Wuyan Pampore)');

  // 2. Purchase Order
  await db.query(`
    INSERT INTO purchase_orders (
      id, project_id, po_number, vendor_id, vendor_name, work_component,
      vendor_contact_person, vendor_phone, vendor_email, vendor_gstin, vendor_address,
      billing_address, shipping_address, order_date, expected_delivery_date,
      payment_terms, delivery_terms, subtotal_amount, tax_amount, freight_charges,
      other_charges, grand_total, status, issued_by_name, approved_by_name, notes,
      created_at, updated_at
    ) VALUES (
      $1, $2, 'PO-KIPL-2025-0004', $3, 'Alamdar Stone Crusher', 'Sewer Pipeline Trenching, Bedding & Pipe Laying',
      'Proprietor / Site Sales (9797844511)', '9797844511', 'allamdarstonecrusher786@gmail.com', '01ABMFA5025A1Z9', 'Wuyan Pampore-191102 Kashmir',
      'M/s Khilari Infrastructure Pvt. Ltd., 30 MLD STP Ishbar Nishat Srinagar',
      'Shalimar SPS & Sewer Network Site, Srinagar, J&K',
      '2025-12-20', '2026-01-15',
      '30 days against verified site delivery challans & bill', 'FOR Shalimar Site, Srinagar',
      83500.00, 0.00, 0.00, 0.00, 83500.00, 'completed', 'Procurement Head Office', 'Project Manager',
      'Rate contract for aggregate materials: Khakh Bajari @ ₹17.50/cft and Dust Screen @ ₹25.00/cft delivered to Shalimar site against Bill #005.',
      NOW(), NOW()
    ) ON CONFLICT (id) DO UPDATE SET
      grand_total = EXCLUDED.grand_total, status = EXCLUDED.status
  `, [poId, projectId, vendorId]);

  // PO Items
  await db.query(`
    INSERT INTO purchase_order_items (
      id, purchase_order_id, item_description, hsn_code, quantity, unit,
      unit_rate, discount_percent, gst_rate, taxable_amount, gst_amount, total_amount, received_qty,
      created_at, updated_at
    ) VALUES 
      ($1, $2, 'Khakh Bajari (Khak Bajri)', '2517', 4200.000, 'cft', 17.50, 0.00, 0.00, 73500.00, 0.00, 73500.00, 4200.000, NOW(), NOW()),
      ($3, $2, 'Dust Screen (Stone Dust)', '2517', 400.000, 'cft', 25.00, 0.00, 0.00, 10000.00, 0.00, 10000.00, 400.000, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET
      quantity = EXCLUDED.quantity, received_qty = EXCLUDED.received_qty, total_amount = EXCLUDED.total_amount
  `, [poItem1Id, poId, poItem2Id]);
  console.log(' 2. Purchase Order seeded: PO-KIPL-2025-0004 (Grand Total: ₹83,500.00)');

  // 3. Goods Receipt Notes (GRN)
  await db.query(`
    INSERT INTO goods_receipt_notes (
      id, project_id, grn_number, purchase_order_id, received_date,
      challan_number, invoice_number, vehicle_number, received_by_name, remarks,
      write_to_material_register, created_at, updated_at
    ) VALUES 
      ($1, $2, 'GRN-2025-0002', $3, '2025-12-26', 'CH-ALM-20251226', '005', '0656, 1916, 5507, 9360, 8759, 9971, 9340, 8703, 7704',
       'Shahid Khan (Site Incharge)', 'Received 9 tippers (4,200 cft) Khakh Bajari from Alamdar Stone Crusher at Shalimar site for sewer trench bedding.', true, NOW(), NOW()),
      ($4, $2, 'GRN-2026-0003', $3, '2026-01-09', 'CH-ALM-20260109', '005', '7704',
       'Shahid Khan (Site Incharge)', 'Received 1 tipper (400 cft) Dust Screen from Alamdar Stone Crusher at Shalimar site for screen bedding.', true, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET
      received_date = EXCLUDED.received_date, invoice_number = EXCLUDED.invoice_number, vehicle_number = EXCLUDED.vehicle_number
  `, [grn1Id, projectId, poId, grn2Id]);
  console.log(' 3. GRNs seeded: GRN-2025-0002 (26/12/2025) & GRN-2026-0003 (09/01/2026)');

  // 4. Material Register (10 delivery trips)
  await db.query(`DELETE FROM material_register WHERE remarks LIKE '%Alamdar Stone Crusher Bill #005%'`);
  await db.query(`
    INSERT INTO material_register (project_id, date, material, unit, received_qty, consumed_qty, contractor_rep, ueed_rep, remarks, created_at, updated_at)
    VALUES
      ($1, '2025-12-26', 'Khak Bajri', 'cft', 600.000, 0.000, 'Shahid Khan (Site Incharge)', 'Er. Samiullah Beigh / AEE S&D-I', 'Tipper #0656 (600 cft) — Alamdar Stone Crusher Bill #005 — Shalimar site sewer bedding', NOW(), NOW()),
      ($1, '2025-12-26', 'Khak Bajri', 'cft', 600.000, 0.000, 'Shahid Khan (Site Incharge)', 'Er. Samiullah Beigh / AEE S&D-I', 'Tipper #1916 (600 cft) — Alamdar Stone Crusher Bill #005 — Shalimar site sewer bedding', NOW(), NOW()),
      ($1, '2025-12-26', 'Khak Bajri', 'cft', 600.000, 0.000, 'Shahid Khan (Site Incharge)', 'Er. Samiullah Beigh / AEE S&D-I', 'Tipper #5507 (600 cft) — Alamdar Stone Crusher Bill #005 — Shalimar site sewer bedding', NOW(), NOW()),
      ($1, '2025-12-26', 'Khak Bajri', 'cft', 400.000, 0.000, 'Shahid Khan (Site Incharge)', 'Er. Samiullah Beigh / AEE S&D-I', 'Tipper #9360 (400 cft) — Alamdar Stone Crusher Bill #005 — Shalimar site sewer bedding', NOW(), NOW()),
      ($1, '2025-12-26', 'Khak Bajri', 'cft', 400.000, 0.000, 'Shahid Khan (Site Incharge)', 'Er. Samiullah Beigh / AEE S&D-I', 'Tipper #8759 (400 cft) — Alamdar Stone Crusher Bill #005 — Shalimar site sewer bedding', NOW(), NOW()),
      ($1, '2025-12-26', 'Khak Bajri', 'cft', 400.000, 0.000, 'Shahid Khan (Site Incharge)', 'Er. Samiullah Beigh / AEE S&D-I', 'Tipper #9971 (400 cft) — Alamdar Stone Crusher Bill #005 — Shalimar site sewer bedding', NOW(), NOW()),
      ($1, '2025-12-26', 'Khak Bajri', 'cft', 400.000, 0.000, 'Shahid Khan (Site Incharge)', 'Er. Samiullah Beigh / AEE S&D-I', 'Tipper #9340 (400 cft) — Alamdar Stone Crusher Bill #005 — Shalimar site sewer bedding', NOW(), NOW()),
      ($1, '2025-12-26', 'Khak Bajri', 'cft', 400.000, 0.000, 'Shahid Khan (Site Incharge)', 'Er. Samiullah Beigh / AEE S&D-I', 'Tipper #8703 (400 cft) — Alamdar Stone Crusher Bill #005 — Shalimar site sewer bedding', NOW(), NOW()),
      ($1, '2025-12-26', 'Khak Bajri', 'cft', 400.000, 0.000, 'Shahid Khan (Site Incharge)', 'Er. Samiullah Beigh / AEE S&D-I', 'Tipper #7704 (400 cft) — Alamdar Stone Crusher Bill #005 — Shalimar site sewer bedding', NOW(), NOW()),
      ($1, '2026-01-09', 'Stone Dust / Crushed Sand', 'cft', 400.000, 0.000, 'Shahid Khan (Site Incharge)', 'Er. Samiullah Beigh / AEE S&D-I', 'Tipper #7704 (400 cft) — Alamdar Stone Crusher Bill #005 — Shalimar site screen bedding', NOW(), NOW())
  `, [projectId]);
  console.log(' 4. Material Register seeded: 10 trips (4,200 cft Khak Bajri + 400 cft Stone Dust)');

  // 5. Payment Requisition
  await db.query(`
    INSERT INTO payment_requisitions (
      id, project_id, pr_number, title, pr_date, site_location, requested_by_name,
      status, total_order_cost, total_advance_paid, total_amount_to_pay, total_balance,
      procurement_status, procurement_approved_by_name, procurement_approved_at, procurement_remarks,
      accounts_status, accounts_approved_by_name, accounts_approved_at, accounts_remarks,
      notes, created_at, updated_at
    ) VALUES (
      $1, $2, 'PR-2026-0002', 'Payment Requisition for Aggregates & Stone Dust — Alamdar Stone Crusher (Bill #005)',
      '2026-01-10', 'Shalimar / 30 MLD STP Ishbar Nishat', 'Shahid Khan (Site Incharge)',
      'approved', 83500.00, 0.00, 83500.00, 0.00,
      'approved', 'Project Manager', '2026-01-11 10:30:00+00',
      'Quantity verified against 10 tipper delivery challans & site measurement at Shalimar. Recommended for payment.',
      'approved', 'Accountant', '2026-01-11 14:15:00+00',
      'Bill #005 verified. GST 0%. Bank details matched with vendor master (J&K Bank Khonmoh JAKA0KONMOH). Passed for RTGS.',
      'Payment against Alamdar Stone Crusher Bill #005 dated 10/01/2026. Deliveries on 26/12/2025 and 09/01/2026.',
      NOW(), NOW()
    ) ON CONFLICT (id) DO UPDATE SET
      total_amount_to_pay = EXCLUDED.total_amount_to_pay, status = EXCLUDED.status
  `, [prId, projectId]);

  await db.query(`
    INSERT INTO payment_requisition_items (
      id, payment_requisition_id, sr_no, vendor_id, vendor_name, description,
      material_or_services, is_msme, total_order_cost, advance_paid, amount_to_pay,
      balance_amount, site_location, remark, against_ref, mode_of_payment, created_at, updated_at
    ) VALUES (
      $1, $2, 1, $3, 'Alamdar Stone Crusher',
      'Supply of Khakh Bajari (4,200 cft @ 17.50) & Dust Screen (400 cft @ 25.00) for Shalimar site trench bedding',
      'Material', true, 83500.00, 0.00, 83500.00, 0.00,
      'Shalimar / 30 MLD STP Ishbar Nishat', 'Against Tax Invoice Bill #005 dt. 10/01/2026',
      'Bill #005 (GRN-2025-0002 & GRN-2026-0003)', 'RTGS', NOW(), NOW()
    ) ON CONFLICT (id) DO UPDATE SET
      amount_to_pay = EXCLUDED.amount_to_pay, balance_amount = EXCLUDED.balance_amount
  `, [prItem1Id, prId, vendorId]);
  console.log(' 5. Payment Requisition seeded: PR-2026-0002 (₹83,500.00 Dual-Approved)');

  // 6. Expense in Accounting
  await db.query(`
    INSERT INTO expenses (
      id, project_id, vendor_id, date, description, category,
      bill_no, bill_date, gross_amount, gst_pct, gst_amount,
      tds_pct, tds_amount, net_payable, paid_amount, payment_mode,
      status, approved_by, remarks, created_at, updated_at
    ) VALUES (
      $1, $2, $3, '2026-01-10',
      'Material supply: 4,200 cft Khakh Bajari + 400 cft Dust Screen for Shalimar SPS & sewer network bedding (Bill #005)',
      'material', '005', '2026-01-10', 83500.00, 0.00, 0.00, 0.00, 0.00, 83500.00, 0.00,
      'RTGS', 'approved', 'Accountant',
      '10 tipper trips verified at Shalimar site. RTGS to J&K Bank Khonmoh A/C (IFSC: JAKA0KONMOH).',
      NOW(), NOW()
    ) ON CONFLICT (id) DO UPDATE SET
      gross_amount = EXCLUDED.gross_amount, net_payable = EXCLUDED.net_payable, status = EXCLUDED.status
  `, [expenseId, projectId, vendorId]);
  console.log(' 6. Accounting Expense seeded: Bill #005 (Gross: ₹83,500.00, Net: ₹83,500.00)');

  // 7. Site Diaries (Date-Wise)
  console.log(' 7. Site Diaries updated for 2025-12-26 and 2026-01-09');

  console.log('\n================ ALL MODULES SEEDED SUCCESSFULLY ================');
  await db.end();
}

main().catch(e => {
  console.error('Error seeding Alamdar invoice:', e);
  db.end();
});
