/**
 * Seeds Alamdar Stone Crusher Bill #005 into Supabase Production.
 * Uses SUPABASE_DB_URL or explicit connection parameters.
 */
const { Client } = require('pg');

const c = new Client(process.env.DATABASE_URL ? {
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
} : {
  host: process.env.SUPABASE_HOST || 'aws-0-ap-northeast-1.pooler.supabase.com',
  port: parseInt(process.env.SUPABASE_PORT || '5432', 10),
  database: process.env.SUPABASE_DB || 'postgres',
  user: process.env.SUPABASE_USER || 'postgres.pfgivrzqsgbxiuhloinu',
  password: process.env.SUPABASE_PASSWORD || 'Vpcea46fg@1746',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await c.connect();
  console.log('Connected to Supabase production database.');

  await c.query('BEGIN');

  try {
    console.log('1. Ensuring purchase_orders schema compatibility...');
    const alterStatements = [
      'ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS vendor_contact_person VARCHAR(120)',
      'ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS vendor_phone VARCHAR(50)',
      'ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS vendor_email VARCHAR(120)',
      'ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS vendor_gstin VARCHAR(50)',
      'ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS vendor_address TEXT',
      'ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS billing_address TEXT',
      'ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS shipping_address TEXT',
      'ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS order_date DATE',
      'ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS expected_delivery_date DATE',
      'ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS delivery_terms TEXT',
      'ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS subtotal_amount NUMERIC(15, 2) DEFAULT 0',
      'ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(15, 2) DEFAULT 0',
      'ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS freight_charges NUMERIC(15, 2) DEFAULT 0',
      'ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS other_charges NUMERIC(15, 2) DEFAULT 0',
      'ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS grand_total NUMERIC(15, 2) DEFAULT 0',
      'ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS issued_by_id UUID',
      'ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS issued_by_name VARCHAR(120)',
      'ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS approved_by_id UUID',
      'ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS approved_by_name VARCHAR(120)',
      'ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS notes TEXT',
      'ALTER TABLE goods_receipt_notes ALTER COLUMN vehicle_number TYPE VARCHAR(255)'
    ];

    for (const stmt of alterStatements) {
      await c.query(stmt);
    }

    console.log('2. Seeding Master Dropdown Options...');
    const dropdownOptions = [
      {
        dropdown_type: 'unit',
        label: 'cft (Cubic Feet)',
        value: 'cft',
        category: null,
        unit: null,
        spec: null,
        metadata: '{}',
        display_order: 13
      },
      {
        dropdown_type: 'site_zone',
        label: 'Shalimar Site (SPS & Network)',
        value: 'Shalimar Site',
        category: null,
        unit: null,
        spec: null,
        metadata: '{}',
        display_order: 14
      },
      {
        dropdown_type: 'site_zone',
        label: '30 MLD STP Ishbar Nishat',
        value: '30 MLD STP Ishbar Nishat',
        category: null,
        unit: null,
        spec: null,
        metadata: '{}',
        display_order: 15
      },
      {
        dropdown_type: 'stakeholder',
        label: 'Alamdar Stone Crusher (Wuyan Pampore)',
        value: 'Alamdar Stone Crusher',
        category: 'material_supplier',
        unit: null,
        spec: null,
        metadata: JSON.stringify({ category: 'material_supplier', phone: '9797844511' }),
        display_order: 20
      },
      {
        dropdown_type: 'material',
        label: 'Khak Bajri',
        value: 'Khak Bajri',
        category: 'aggregate_sand',
        unit: 'cft',
        spec: 'Crusher dust / fine stone dust for leveling, bedding and masonry',
        metadata: JSON.stringify({ aliases: ['khakh bajari', 'khakh bajri', 'crusher dust', 'khaka bajri'] }),
        display_order: 10
      },
      {
        dropdown_type: 'material',
        label: 'Stone Dust / Crushed Sand',
        value: 'Stone Dust / Crushed Sand',
        category: 'aggregate_sand',
        unit: 'cft',
        spec: 'Stone dust / screen dust / crushed sand for pipe bedding and masonry',
        metadata: JSON.stringify({ aliases: ['dust screen', 'stone dust', 'screen dust'] }),
        display_order: 11
      }
    ];

    for (const opt of dropdownOptions) {
      await c.query(`
        INSERT INTO master_dropdown_options (dropdown_type, label, value, category, unit, spec, metadata, display_order)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (dropdown_type, value) 
        DO UPDATE SET 
          label = EXCLUDED.label,
          category = COALESCE(EXCLUDED.category, master_dropdown_options.category),
          unit = COALESCE(EXCLUDED.unit, master_dropdown_options.unit),
          spec = COALESCE(EXCLUDED.spec, master_dropdown_options.spec),
          metadata = COALESCE(EXCLUDED.metadata, master_dropdown_options.metadata),
          display_order = EXCLUDED.display_order
      `, [opt.dropdown_type, opt.label, opt.value, opt.category, opt.unit, opt.spec, opt.metadata, opt.display_order]);
    }

    console.log('3. Updating Vendor Alamdar Stone Crusher...');
    const vendorId = 'b99e1d96-575d-4213-8d7d-a4be9808e355';
    const projectId = '4a5176c7-0f53-42cc-bbd8-1a7259648a96';

    await c.query(`
      UPDATE vendors
      SET 
        trade_name = 'Alamdar Stone Crusher',
        gstin = '01ABMFA5025A1Z9',
        pan = 'ABMFA5025A',
        phone = '9797844511',
        email = 'allamdarstonecrusher786@gmail.com',
        address = 'Wuyan Pampore-191102 Kashmir, 01-Jammu & Kashmir',
        bank_account = '{"bank": "J&K Bank", "branch": "Khonmoh", "ifsc": "JAKA0KONMOH"}'::jsonb,
        tds_applicable = true,
        tds_rate = 2.00,
        is_active = true,
        updated_at = NOW()
      WHERE id = $1
    `, [vendorId]);

    console.log('4. Seeding Purchase Order PO-KIPL-2025-0004...');
    const poId = 'b2b4da40-570e-4b11-9e23-786000000005';
    const poItemsJson = [
      {
        item_description: 'Khakh Bajari (Khak Bajri)',
        hsn_code: '2517',
        quantity: 4200,
        unit: 'cft',
        unit_rate: 17.50,
        taxable_amount: 73500,
        gst_rate: 0,
        gst_amount: 0,
        total_amount: 73500
      },
      {
        item_description: 'Dust Screen (Stone Dust)',
        hsn_code: '2517',
        quantity: 400,
        unit: 'cft',
        unit_rate: 25.00,
        taxable_amount: 10000,
        gst_rate: 0,
        gst_amount: 0,
        total_amount: 10000
      }
    ];

    await c.query(`
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
        $1, $2, $3, $4, $4, $5,
        $6, $7, $8, $9, $10, $11,
        $12, $13, $14, $15, $16, $17,
        $18, $19, $20,
        $21, $22, $22, $22, $22,
        $21, $22, $22, $22, $21, $21,
        $23, $24, $25, $24, $25, $26, $26,
        NOW(), NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        vendor_id = EXCLUDED.vendor_id,
        total_amount = EXCLUDED.total_amount,
        grand_total = EXCLUDED.grand_total,
        status = EXCLUDED.status,
        items = EXCLUDED.items,
        updated_at = NOW()
    `, [
      poId, projectId, 'PO-KIPL-2025-0004', '2025-12-20', '2026-01-15',
      vendorId, 'Alamdar Stone Crusher', '9797844511', 'allamdarstonecrusher786@gmail.com', '01ABMFA5025A1Z9', 'Wuyan Pampore-191102 Kashmir',
      'Supply of Khakh Bajari & Dust Screen for Shalimar SPS & Sewer Network Site', 'aggregate_sand', 'Sewer Pipeline Trenching, Bedding & Pipe Laying',
      'Shalimar SPS & Sewer Network Site, Srinagar, J&K', 'M/s Khilari Infrastructure Pvt. Ltd., 30 MLD STP Ishbar Nishat Srinagar', 'Shalimar SPS & Sewer Network Site, Srinagar, J&K',
      '30 days against verified site delivery challans & bill', 'FOR Shalimar Site, Srinagar', JSON.stringify(poItemsJson),
      83500.00, 0.00, 'completed', 'Procurement Head Office', 'Project Manager',
      'Rate contract for aggregate materials: Khakh Bajari @ ₹17.50/cft and Dust Screen @ ₹25.00/cft delivered to Shalimar site against Bill #005.'
    ]);

    const poItem1 = 'c3c4da40-570e-4b11-9e23-786000000001';
    const poItem2 = 'c3c4da40-570e-4b11-9e23-786000000002';

    await c.query(`
      INSERT INTO purchase_order_items (
        id, purchase_order_id, item_description, hsn_code, quantity, unit,
        unit_rate, discount_percent, gst_rate, taxable_amount, gst_amount, total_amount, received_qty,
        created_at, updated_at
      ) VALUES
      ($1, $2, 'Khakh Bajari (Khak Bajri)', '2517', 4200.000, 'cft', 17.50, 0.00, 0.00, 73500.00, 0.00, 73500.00, 4200.000, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        quantity = EXCLUDED.quantity,
        received_qty = EXCLUDED.received_qty,
        total_amount = EXCLUDED.total_amount,
        updated_at = NOW()
    `, [poItem1, poId]);

    await c.query(`
      INSERT INTO purchase_order_items (
        id, purchase_order_id, item_description, hsn_code, quantity, unit,
        unit_rate, discount_percent, gst_rate, taxable_amount, gst_amount, total_amount, received_qty,
        created_at, updated_at
      ) VALUES
      ($1, $2, 'Dust Screen (Stone Dust)', '2517', 400.000, 'cft', 25.00, 0.00, 0.00, 10000.00, 0.00, 10000.00, 400.000, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        quantity = EXCLUDED.quantity,
        received_qty = EXCLUDED.received_qty,
        total_amount = EXCLUDED.total_amount,
        updated_at = NOW()
    `, [poItem2, poId]);

    console.log('5. Seeding Goods Receipt Notes...');
    const grn1 = 'd4d4da40-570e-4b11-9e23-786000000001';
    const grn2 = 'd4d4da40-570e-4b11-9e23-786000000002';

    await c.query(`
      INSERT INTO goods_receipt_notes (
        id, project_id, grn_number, purchase_order_id, received_date,
        challan_number, invoice_number, vehicle_number, received_by_name, remarks,
        write_to_material_register, created_at, updated_at
      ) VALUES
      ($1, $2, 'GRN-2025-0002', $3, '2025-12-26', 'CH-ALM-20251226', '005', '0656, 1916, 5507, 9360, 8759, 9971, 9340, 8703, 7704',
       'Shahid Khan (Site Incharge)', 'Received 9 tippers (4,200 cft) Khakh Bajari from Alamdar Stone Crusher at Shalimar site for sewer trench bedding.',
       true, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        received_date = EXCLUDED.received_date,
        invoice_number = EXCLUDED.invoice_number,
        vehicle_number = EXCLUDED.vehicle_number,
        updated_at = NOW()
    `, [grn1, projectId, poId]);

    await c.query(`
      INSERT INTO goods_receipt_notes (
        id, project_id, grn_number, purchase_order_id, received_date,
        challan_number, invoice_number, vehicle_number, received_by_name, remarks,
        write_to_material_register, created_at, updated_at
      ) VALUES
      ($1, $2, 'GRN-2026-0003', $3, '2026-01-09', 'CH-ALM-20260109', '005', '7704',
       'Shahid Khan (Site Incharge)', 'Received 1 tipper (400 cft) Dust Screen from Alamdar Stone Crusher at Shalimar site for screen bedding.',
       true, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        received_date = EXCLUDED.received_date,
        invoice_number = EXCLUDED.invoice_number,
        vehicle_number = EXCLUDED.vehicle_number,
        updated_at = NOW()
    `, [grn2, projectId, poId]);

    await c.query(`
      INSERT INTO goods_receipt_note_items (
        id, grn_id, purchase_order_item_id, item_description, received_qty, unit, remarks, created_at, updated_at
      ) VALUES
      (gen_random_uuid(), $1, $2, 'Khakh Bajari (Khak Bajri)', 4200.000, 'cft',
       '9 tipper trips: 3 x 600 cft (#0656, #1916, #5507) + 6 x 400 cft (#9360, #8759, #9971, #9340, #8703, #7704)', NOW(), NOW())
      ON CONFLICT DO NOTHING
    `, [grn1, poItem1]);

    await c.query(`
      INSERT INTO goods_receipt_note_items (
        id, grn_id, purchase_order_item_id, item_description, received_qty, unit, remarks, created_at, updated_at
      ) VALUES
      (gen_random_uuid(), $1, $2, 'Dust Screen (Stone Dust)', 400.000, 'cft',
       '1 tipper trip: 400 cft (Tipper #7704) at Shalimar site', NOW(), NOW())
      ON CONFLICT DO NOTHING
    `, [grn2, poItem2]);

    console.log('6. Seeding Material Register (Clause 55)...');
    await c.query("DELETE FROM material_register WHERE remarks LIKE '%Alamdar Stone Crusher Bill #005%'");

    const tippersKhak = [
      { veh: '0656', qty: 600 },
      { veh: '1916', qty: 600 },
      { veh: '5507', qty: 600 },
      { veh: '9360', qty: 400 },
      { veh: '8759', qty: 400 },
      { veh: '9971', qty: 400 },
      { veh: '9340', qty: 400 },
      { veh: '8703', qty: 400 },
      { veh: '7704', qty: 400 }
    ];

    for (const t of tippersKhak) {
      const amount = +(t.qty * 17.50).toFixed(2);
      await c.query(`
        INSERT INTO material_register (
          project_id, date, material, unit, received_qty, consumed_qty,
          rate, amount, purpose, challan_no, grn_id, wbs_code,
          contractor_rep, ueed_rep, remarks, vendor_id, supplier_name,
          invoice_no, po_number, vehicle_no, site_zone, qa_status, balance_stock,
          created_at, updated_at
        ) VALUES (
          $1, '2025-12-26', 'Khak Bajri', 'cft', $2, 0.000,
          17.50, $3, 'Sewer pipeline trenching, bedding and pipe laying at Shalimar site', 'CH-ALM-20251226', $4, 'WBS-SHAL-SEW',
          'Shahid Khan (Site Incharge)', 'Er. Samiullah Beigh / AEE S&D-I',
          $5, $6, 'Alamdar Stone Crusher',
          '005', 'PO-KIPL-2025-0004', $7, 'Shalimar Site', 'verified', 0.00,
          NOW(), NOW()
        )
      `, [
        projectId, t.qty, amount, grn1,
        `Tipper #${t.veh} (${t.qty} cft) — Alamdar Stone Crusher Bill #005 — Shalimar site sewer bedding`,
        vendorId, t.veh
      ]);
    }

    await c.query(`
      INSERT INTO material_register (
        project_id, date, material, unit, received_qty, consumed_qty,
        rate, amount, purpose, challan_no, grn_id, wbs_code,
        contractor_rep, ueed_rep, remarks, vendor_id, supplier_name,
        invoice_no, po_number, vehicle_no, site_zone, qa_status, balance_stock,
        created_at, updated_at
      ) VALUES (
        $1, '2026-01-09', 'Stone Dust / Crushed Sand', 'cft', 400.000, 0.000,
        25.00, 10000.00, 'Sewer pipe joint encasement, screen bedding and backfilling at Shalimar site', 'CH-ALM-20260109', $2, 'WBS-SHAL-SEW',
        'Shahid Khan (Site Incharge)', 'Er. Samiullah Beigh / AEE S&D-I',
        'Tipper #7704 (400 cft) — Alamdar Stone Crusher Bill #005 — Shalimar site screen bedding',
        $3, 'Alamdar Stone Crusher',
        '005', 'PO-KIPL-2025-0004', '7704', 'Shalimar Site', 'verified', 0.00,
        NOW(), NOW()
      )
    `, [projectId, grn2, vendorId]);

    console.log('7. Seeding Payment Requisition PR-2026-0002...');
    const prId = 'e5e4da40-570e-4b11-9e23-786000000001';
    const prItemId = 'f6f4da40-570e-4b11-9e23-786000000001';

    await c.query(`
      INSERT INTO payment_requisitions (
        id, project_id, pr_number, title, pr_date, site_location, requested_by_name,
        status, total_order_cost, total_advance_paid, total_amount_to_pay, total_balance,
        procurement_status, procurement_approved_by_name, procurement_approved_at, procurement_remarks,
        accounts_status, accounts_approved_by_name, accounts_approved_at, accounts_remarks,
        notes, created_at, updated_at
      ) VALUES (
        $1, $2, 'PR-2026-0002',
        'Payment Requisition for Aggregates & Stone Dust — Alamdar Stone Crusher (Bill #005)',
        '2026-01-10', 'Shalimar / 30 MLD STP Ishbar Nishat', 'Shahid Khan (Site Incharge)',
        'approved', 83500.00, 0.00, 83500.00, 0.00,
        'approved', 'Project Manager', '2026-01-11 10:30:00+00',
        'Quantity verified against 10 tipper delivery challans & site measurement at Shalimar. Recommended for payment.',
        'approved', 'Accountant', '2026-01-11 14:15:00+00',
        'Bill #005 verified. GST 0%. Bank details matched with vendor master (J&K Bank Khonmoh JAKA0KONMOH). Passed for RTGS.',
        'Payment against Alamdar Stone Crusher Bill #005 dated 10/01/2026. Deliveries on 26/12/2025 and 09/01/2026.',
        NOW(), NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        total_amount_to_pay = EXCLUDED.total_amount_to_pay,
        status = EXCLUDED.status,
        updated_at = NOW()
    `, [prId, projectId]);

    await c.query(`
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
      )
      ON CONFLICT (id) DO UPDATE SET
        amount_to_pay = EXCLUDED.amount_to_pay,
        balance_amount = EXCLUDED.balance_amount,
        updated_at = NOW()
    `, [prItemId, prId, vendorId]);

    console.log('8. Seeding Expenses Bill #005...');
    const expenseId = '1111da40-570e-4b11-9e23-786000000005';

    await c.query(`
      INSERT INTO expenses (
        id, project_id, vendor_id, date, description, category,
        bill_no, bill_date, gross_amount, gst_pct, gst_amount,
        tds_pct, tds_amount, net_payable, paid_amount, payment_mode,
        status, approved_by, remarks, created_at, updated_at
      ) VALUES (
        $1, $2, $3, '2026-01-10',
        'Material supply: 4,200 cft Khakh Bajari + 400 cft Dust Screen for Shalimar SPS & sewer network bedding (Bill #005)',
        'material', '005', '2026-01-10',
        83500.00, 0.00, 0.00,
        0.00, 0.00, 83500.00, 0.00, 'RTGS',
        'approved', 'Accountant',
        '10 tipper trips verified at Shalimar site. RTGS to J&K Bank Khonmoh A/C (IFSC: JAKA0KONMOH).',
        NOW(), NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        gross_amount = EXCLUDED.gross_amount,
        net_payable = EXCLUDED.net_payable,
        status = EXCLUDED.status,
        updated_at = NOW()
    `, [expenseId, projectId, vendorId]);

    console.log('9. Updating Site Diaries...');
    const d1 = await c.query("SELECT id FROM site_diaries WHERE project_id = $1 AND date = '2025-12-26'", [projectId]);
    if (d1.rows.length > 0) {
      await c.query(`
        UPDATE site_diaries
        SET 
          materials_received = jsonb_build_array(
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
        WHERE id = $1
      `, [d1.rows[0].id]);
    }

    const d2 = await c.query("SELECT id FROM site_diaries WHERE project_id = $1 AND date = '2026-01-09'", [projectId]);
    if (d2.rows.length > 0) {
      await c.query(`
        UPDATE site_diaries
        SET 
          materials_received = jsonb_build_array(
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
        WHERE id = $1
      `, [d2.rows[0].id]);
    }

    await c.query('COMMIT');
    console.log('SUCCESS: Production Supabase database successfully seeded with Alamdar Stone Crusher Bill #005 data!');
  } catch (err) {
    await c.query('ROLLBACK');
    console.error('ERROR during Supabase seeding (transaction rolled back):', err);
    throw err;
  } finally {
    await c.end();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
