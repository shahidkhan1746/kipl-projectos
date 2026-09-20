/**
 * Seeds Alamdar Stone Crusher August 2026 Batch:
 * 1. Bill #148-KB-NISHT (Dated 01/08/2026 - ₹80,063.00, 12 tippers Khakh Bajari)
 * 2. Bill #149 (Dated 11/08/2026 - ₹5,80,500.00, 49 tippers: 1 Wet Mix + 48 CTSB)
 * 3. Bill #150 (Dated 11/08/2026 - ₹1,86,000.00, 16 tippers Over Gauge)
 * 4. Bill #151 (Dated 11/08/2026 - ₹24,000.00, 2 tippers Dust)
 * Total Statement of Account: ₹8,70,563.00 across 79 Delivery Trips.
 * Auto-generates and updates Site Diaries across all 10 dates.
 */

let pg;
try {
  pg = require('pg');
} catch (e) {
  try {
    pg = require('../backend/node_modules/pg');
  } catch (e2) {
    pg = require('./backend/node_modules/pg');
  }
}
const { Client } = pg;

const c = new Client({
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
    const projectId = '4a5176c7-0f53-42cc-bbd8-1a7259648a96';
    const vendorId = 'b99e1d96-575d-4213-8d7d-a4be9808e355'; // Alamdar Stone Crusher

    // 1. Master Dropdown Options
    console.log('1. Updating Master Dropdown Options...');
    await c.query(`
      INSERT INTO master_dropdown_options (dropdown_type, label, value, category, unit, spec, metadata, display_order)
      VALUES (
        'material',
        'Over Gauge (Soling Stone / Boulders)',
        'Over Gauge (Soling Stone / Boulders)',
        'aggregate_sand',
        'cft',
        'Heavy rock soling and over-gauge boulders for road base, subgrade stabilization and trench bottom soling',
        '{"aliases": ["over gauge", "overgauge", "soling stone", "boulders", "oversize stone", "over size", "over-gauge"]}'::jsonb,
        14
      )
      ON CONFLICT (dropdown_type, value) DO UPDATE SET
        label = EXCLUDED.label,
        category = EXCLUDED.category,
        unit = EXCLUDED.unit,
        spec = EXCLUDED.spec,
        metadata = EXCLUDED.metadata
    `);

    // 2. Purchase Orders
    console.log('2. Seeding Purchase Orders...');

    // PO for Bill 148-KB-NISHT
    const po148Id = 'b2b4da40-570e-4b11-9e23-786000000148';
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
        $1, $2, 'PO-KIPL-2026-0007', '2026-07-25', '2026-07-25', '2026-08-01',
        $3, 'Alamdar Stone Crusher', '9797844511', 'allamdarstonecrusher786@gmail.com', '01ABMFA5025A1Z9', 'Wuyan Pampore-191102 Kashmir',
        'Supply of Khakh Bajari for Pipe Bedding & Surrounds at 30 MLD STP Ishbar Nishat', 'aggregate_sand', 'Pipe Laying, Bedding & Trench Backfilling',
        '30 MLD STP Site, Gupt Ganga Ishbar Nishat, Srinagar', 'M/s Khilari Infrastructure Pvt. Ltd., 30 MLD STP Ishbar Nishat Srinagar', '30 MLD STP Site, Gupt Ganga Ishbar Nishat, Srinagar',
        'Against verified site delivery challans & bill', 'FOR Nishat STP Site',
        '[{"item_description": "Khakh Bajari (Khak Bajri)", "quantity": 4575, "unit": "cft", "unit_rate": 17.50, "taxable_amount": 80062.50, "total_amount": 80063.00}]'::jsonb,
        80062.50, 0.00, 0.00, 0.00, 0.00,
        80062.50, 0.00, 0.00, 0.50, 80063.00, 80063.00,
        'completed', 'Procurement Head Office', 'Project Manager', 'Procurement Head Office', 'Project Manager',
        'Rate contract for Khakh Bajari @ ₹17.50/cft delivered to Nishat site against Bill #148-KB-NISHT.',
        'Rate contract for Khakh Bajari @ ₹17.50/cft delivered to Nishat site against Bill #148-KB-NISHT.',
        NOW(), NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        grand_total = EXCLUDED.grand_total,
        total_amount = EXCLUDED.total_amount,
        status = EXCLUDED.status,
        updated_at = NOW()
    `, [po148Id, projectId, vendorId]);

    await c.query(`
      INSERT INTO purchase_order_items (
        id, purchase_order_id, item_description, hsn_code, quantity, unit,
        unit_rate, discount_percent, gst_rate, taxable_amount, gst_amount, total_amount, received_qty,
        created_at, updated_at
      ) VALUES
      (gen_random_uuid(), $1, 'Khakh Bajari (Khak Bajri)', '2517', 4575.000, 'cft', 17.50, 0.00, 0.00, 80062.50, 0.00, 80063.00, 4575.000, NOW(), NOW())
      ON CONFLICT DO NOTHING
    `, [po148Id]);

    // PO for Bill 149
    const po149Id = 'b2b4da40-570e-4b11-9e23-786000000149';
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
        $1, $2, 'PO-KIPL-2026-0008', '2026-07-15', '2026-07-15', '2026-08-11',
        $3, 'Alamdar Stone Crusher', '9797844511', 'allamdarstonecrusher786@gmail.com', '01ABMFA5025A1Z9', 'Wuyan Pampore-191102 Kashmir',
        'Supply of Wet Mix Macadam & CTSB for Internal Road Network & Sub-Base at 30 MLD STP Nishat', 'aggregate_sand', 'Internal Road Network & Pavement Foundation',
        '30 MLD STP Site, Gupt Ganga Ishbar Nishat, Srinagar', 'M/s Khilari Infrastructure Pvt. Ltd., 30 MLD STP Ishbar Nishat Srinagar', '30 MLD STP Site, Gupt Ganga Ishbar Nishat, Srinagar',
        'Against verified site delivery challans & bill', 'FOR Nishat STP Site',
        '[{"item_description": "Wet Mix Macadam (WMM)", "quantity": 375, "unit": "cft", "unit_rate": 30.00, "total_amount": 11250.00}, {"item_description": "CTSB (Crushed / Cement Treated Sub-Base)", "quantity": 18975, "unit": "cft", "unit_rate": 30.00, "total_amount": 569250.00}]'::jsonb,
        580500.00, 0.00, 0.00, 0.00, 0.00,
        580500.00, 0.00, 0.00, 0.00, 580500.00, 580500.00,
        'completed', 'Procurement Head Office', 'Project Manager', 'Procurement Head Office', 'Project Manager',
        'Rate contract for Wet Mix @ ₹30.00/cft and CTSB @ ₹30.00/cft delivered to Nishat site against Bill #149.',
        'Rate contract for Wet Mix @ ₹30.00/cft and CTSB @ ₹30.00/cft delivered to Nishat site against Bill #149.',
        NOW(), NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        grand_total = EXCLUDED.grand_total,
        total_amount = EXCLUDED.total_amount,
        status = EXCLUDED.status,
        updated_at = NOW()
    `, [po149Id, projectId, vendorId]);

    await c.query(`
      INSERT INTO purchase_order_items (
        id, purchase_order_id, item_description, hsn_code, quantity, unit,
        unit_rate, discount_percent, gst_rate, taxable_amount, gst_amount, total_amount, received_qty,
        created_at, updated_at
      ) VALUES
      (gen_random_uuid(), $1, 'Wet Mix Macadam (WMM)', '2517', 375.000, 'cft', 30.00, 0.00, 0.00, 11250.00, 0.00, 11250.00, 375.000, NOW(), NOW()),
      (gen_random_uuid(), $1, 'CTSB (Crushed / Cement Treated Sub-Base)', '2517', 18975.000, 'cft', 30.00, 0.00, 0.00, 569250.00, 0.00, 569250.00, 18975.000, NOW(), NOW())
      ON CONFLICT DO NOTHING
    `, [po149Id]);

    // PO for Bill 150
    const po150Id = 'b2b4da40-570e-4b11-9e23-786000000150';
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
        $1, $2, 'PO-KIPL-2026-0009', '2026-08-01', '2026-08-01', '2026-08-05',
        $3, 'Alamdar Stone Crusher', '9797844511', 'allamdarstonecrusher786@gmail.com', '01ABMFA5025A1Z9', 'Wuyan Pampore-191102 Kashmir',
        'Supply of Over Gauge Rock Soling for Subgrade Stabilization at Shalimar Site', 'aggregate_sand', 'Subgrade Stabilization & Rock Soling Foundation',
        'Shalimar Site, Srinagar', 'M/s Khilari Infrastructure Pvt. Ltd., 30 MLD STP Ishbar Nishat Srinagar', 'Shalimar Site, Srinagar',
        'Against verified site delivery challans & bill', 'FOR Shalimar Site',
        '[{"item_description": "Over Gauge (Soling Stone / Boulders)", "quantity": 6200, "unit": "cft", "unit_rate": 30.00, "total_amount": 186000.00}]'::jsonb,
        186000.00, 0.00, 0.00, 0.00, 0.00,
        186000.00, 0.00, 0.00, 0.00, 186000.00, 186000.00,
        'completed', 'Procurement Head Office', 'Project Manager', 'Procurement Head Office', 'Project Manager',
        'Rate contract for Over Gauge @ ₹30.00/cft delivered to Shalimar site against Bill #150.',
        'Rate contract for Over Gauge @ ₹30.00/cft delivered to Shalimar site against Bill #150.',
        NOW(), NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        grand_total = EXCLUDED.grand_total,
        total_amount = EXCLUDED.total_amount,
        status = EXCLUDED.status,
        updated_at = NOW()
    `, [po150Id, projectId, vendorId]);

    await c.query(`
      INSERT INTO purchase_order_items (
        id, purchase_order_id, item_description, hsn_code, quantity, unit,
        unit_rate, discount_percent, gst_rate, taxable_amount, gst_amount, total_amount, received_qty,
        created_at, updated_at
      ) VALUES
      (gen_random_uuid(), $1, 'Over Gauge (Soling Stone / Boulders)', '2517', 6200.000, 'cft', 30.00, 0.00, 0.00, 186000.00, 0.00, 186000.00, 6200.000, NOW(), NOW())
      ON CONFLICT DO NOTHING
    `, [po150Id]);

    // PO for Bill 151
    const po151Id = 'b2b4da40-570e-4b11-9e23-786000000151';
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
        $1, $2, 'PO-KIPL-2026-0010', '2026-08-04', '2026-08-04', '2026-08-06',
        $3, 'Alamdar Stone Crusher', '9797844511', 'allamdarstonecrusher786@gmail.com', '01ABMFA5025A1Z9', 'Wuyan Pampore-191102 Kashmir',
        'Supply of Stone Dust for Bedding & Structural Joint Encasement at 30 MLD STP Nishat', 'aggregate_sand', 'Joint Encasement & Screen Bedding',
        '30 MLD STP Site, Gupt Ganga Ishbar Nishat, Srinagar', 'M/s Khilari Infrastructure Pvt. Ltd., 30 MLD STP Ishbar Nishat Srinagar', '30 MLD STP Site, Gupt Ganga Ishbar Nishat, Srinagar',
        'Against verified site delivery challans & bill', 'FOR Nishat STP Site',
        '[{"item_description": "Stone Dust / Crushed Sand", "quantity": 800, "unit": "cft", "unit_rate": 30.00, "total_amount": 24000.00}]'::jsonb,
        24000.00, 0.00, 0.00, 0.00, 0.00,
        24000.00, 0.00, 0.00, 0.00, 24000.00, 24000.00,
        'completed', 'Procurement Head Office', 'Project Manager', 'Procurement Head Office', 'Project Manager',
        'Rate contract for Stone Dust @ ₹30.00/cft delivered to Nishat site against Bill #151.',
        'Rate contract for Stone Dust @ ₹30.00/cft delivered to Nishat site against Bill #151.',
        NOW(), NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        grand_total = EXCLUDED.grand_total,
        total_amount = EXCLUDED.total_amount,
        status = EXCLUDED.status,
        updated_at = NOW()
    `, [po151Id, projectId, vendorId]);

    await c.query(`
      INSERT INTO purchase_order_items (
        id, purchase_order_id, item_description, hsn_code, quantity, unit,
        unit_rate, discount_percent, gst_rate, taxable_amount, gst_amount, total_amount, received_qty,
        created_at, updated_at
      ) VALUES
      (gen_random_uuid(), $1, 'Stone Dust / Crushed Sand', '2517', 800.000, 'cft', 30.00, 0.00, 0.00, 24000.00, 0.00, 24000.00, 800.000, NOW(), NOW())
      ON CONFLICT DO NOTHING
    `, [po151Id]);

    // 3. Goods Receipt Notes
    console.log('3. Seeding Goods Receipt Notes...');
    const grn148Id = 'd4d4da40-570e-4b11-9e23-786000000148';
    const grn149Id = 'd4d4da40-570e-4b11-9e23-786000000149';
    const grn150Id = 'd4d4da40-570e-4b11-9e23-786000000150';
    const grn151Id = 'd4d4da40-570e-4b11-9e23-786000000151';

    await c.query(`
      INSERT INTO goods_receipt_notes (
        id, project_id, grn_number, purchase_order_id, received_date,
        challan_number, invoice_number, vehicle_number, received_by_name, remarks,
        write_to_material_register, created_at, updated_at
      ) VALUES
      ($1, $2, 'GRN-2026-0007', $3, '2026-08-01', 'CH-ALM-148', '148-KB-NISHT',
       '5509, 2439, 1005, 0011, 1471, 9360, 0663, 8759, 9971, 9340', 'Shahid Khan (Site Incharge)',
       'Received 12 tippers (4,575 cft) Khakh Bajari from Alamdar Stone Crusher at Nishat STP site.', true, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET updated_at = NOW()
    `, [grn148Id, projectId, po148Id]);

    await c.query(`
      INSERT INTO goods_receipt_notes (
        id, project_id, grn_number, purchase_order_id, received_date,
        challan_number, invoice_number, vehicle_number, received_by_name, remarks,
        write_to_material_register, created_at, updated_at
      ) VALUES
      ($1, $2, 'GRN-2026-0008', $3, '2026-08-11', 'CH-ALM-149', '149',
       '2439, 0848, 9971, 1471, 0847, 0011, 8703, 9340, 8759, 7704, 1005, 5509, 9886, 0656, 9360, 0663', 'Shahid Khan (Site Incharge)',
       'Received 49 tippers (19,350 cft total: 375 cft Wet Mix + 18,975 cft CTSB) from Alamdar Stone Crusher at Nishat STP site.', true, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET updated_at = NOW()
    `, [grn149Id, projectId, po149Id]);

    await c.query(`
      INSERT INTO goods_receipt_notes (
        id, project_id, grn_number, purchase_order_id, received_date,
        challan_number, invoice_number, vehicle_number, received_by_name, remarks,
        write_to_material_register, created_at, updated_at
      ) VALUES
      ($1, $2, 'GRN-2026-0009', $3, '2026-08-05', 'CH-ALM-150', '150',
       '9971, 5509, 7704, 0848, 0847, 2439, 9340, 9360, 1471, 0011', 'Shahid Khan (Site Incharge)',
       'Received 16 tippers (6,200 cft) Over Gauge Boulders from Alamdar Stone Crusher at Shalimar site.', true, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET updated_at = NOW()
    `, [grn150Id, projectId, po150Id]);

    await c.query(`
      INSERT INTO goods_receipt_notes (
        id, project_id, grn_number, purchase_order_id, received_date,
        challan_number, invoice_number, vehicle_number, received_by_name, remarks,
        write_to_material_register, created_at, updated_at
      ) VALUES
      ($1, $2, 'GRN-2026-0010', $3, '2026-08-06', 'CH-ALM-151', '151',
       '7704, 5509', 'Shahid Khan (Site Incharge)',
       'Received 2 tippers (800 cft) Stone Dust from Alamdar Stone Crusher at Nishat STP site.', true, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET updated_at = NOW()
    `, [grn151Id, projectId, po151Id]);

    // 4. Material Register (All 79 Trips)
    console.log('4. Seeding Material Register (79 trips)...');
    await c.query("DELETE FROM material_register WHERE invoice_no IN ('148-KB-NISHT', '149', '150', '151')");

    // Bill 148 Trips (12 trips)
    const trips148 = [
      { date: '2026-07-30', veh: '5509', mat: 'Khak Bajri', qty: 375, rate: 17.50, voucher: '' },
      { date: '2026-07-30', veh: '2439', mat: 'Khak Bajri', qty: 375, rate: 17.50, voucher: '' },
      { date: '2026-07-30', veh: '1005', mat: 'Khak Bajri', qty: 375, rate: 17.50, voucher: '' },
      { date: '2026-07-30', veh: '0011', mat: 'Khak Bajri', qty: 350, rate: 17.50, voucher: '' },
      { date: '2026-07-30', veh: '1471', mat: 'Khak Bajri', qty: 350, rate: 17.50, voucher: '' },
      { date: '2026-08-01', veh: '9360', mat: 'Khak Bajri', qty: 400, rate: 17.50, voucher: '' },
      { date: '2026-08-01', veh: '0663', mat: 'Khak Bajri', qty: 400, rate: 17.50, voucher: '' },
      { date: '2026-08-01', veh: '8759', mat: 'Khak Bajri', qty: 400, rate: 17.50, voucher: '' },
      { date: '2026-08-01', veh: '5509', mat: 'Khak Bajri', qty: 375, rate: 17.50, voucher: '' },
      { date: '2026-08-01', veh: '2439', mat: 'Khak Bajri', qty: 375, rate: 17.50, voucher: '' },
      { date: '2026-08-01', veh: '9971', mat: 'Khak Bajri', qty: 400, rate: 17.50, voucher: '' },
      { date: '2026-08-01', veh: '9340', mat: 'Khak Bajri', qty: 400, rate: 17.50, voucher: '' }
    ];

    for (const t of trips148) {
      const amount = +(t.qty * t.rate).toFixed(2);
      await c.query(`
        INSERT INTO material_register (
          project_id, date, material, unit, received_qty, consumed_qty,
          rate, amount, purpose, challan_no, wbs_code,
          contractor_rep, ueed_rep, remarks, vendor_id, supplier_name,
          invoice_no, po_number, vehicle_no, site_zone, qa_status, balance_stock, grn_id,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, 'cft', $4, 0.000,
          $5, $6, 'Pipe bedding surround and trench backfilling at Nishat STP site',
          'CH-ALM-148', 'WBS-SEW-BEDDING',
          'Shahid Khan (Site Incharge)', 'Er. Samiullah Beigh / AEE S&D-I',
          $7, $8, 'Alamdar Stone Crusher',
          '148-KB-NISHT', 'PO-KIPL-2026-0007', $9, '30 MLD STP Ishbar Nishat', 'verified', 0.00, $10,
          NOW(), NOW()
        )
      `, [projectId, t.date, t.mat, t.qty, t.rate, amount,
          `Tipper #${t.veh} (${t.qty} cft) — Alamdar Stone Crusher Bill #148-KB-NISHT — Nishat site`,
          vendorId, t.veh, grn148Id]);
    }

    // Bill 150 Trips (16 trips)
    const trips150 = [
      { date: '2026-08-04', veh: '9971', mat: 'Over Gauge (Soling Stone / Boulders)', qty: 400, rate: 30.00, voucher: '' },
      { date: '2026-08-04', veh: '5509', mat: 'Over Gauge (Soling Stone / Boulders)', qty: 375, rate: 30.00, voucher: '' },
      { date: '2026-08-04', veh: '7704', mat: 'Over Gauge (Soling Stone / Boulders)', qty: 400, rate: 30.00, voucher: '' },
      { date: '2026-08-04', veh: '0848', mat: 'Over Gauge (Soling Stone / Boulders)', qty: 400, rate: 30.00, voucher: '' },
      { date: '2026-08-04', veh: '0847', mat: 'Over Gauge (Soling Stone / Boulders)', qty: 400, rate: 30.00, voucher: '' },
      { date: '2026-08-04', veh: '2439', mat: 'Over Gauge (Soling Stone / Boulders)', qty: 375, rate: 30.00, voucher: '' },
      { date: '2026-08-04', veh: '9340', mat: 'Over Gauge (Soling Stone / Boulders)', qty: 400, rate: 30.00, voucher: '' },
      { date: '2026-08-05', veh: '9360', mat: 'Over Gauge (Soling Stone / Boulders)', qty: 400, rate: 30.00, voucher: '01' },
      { date: '2026-08-05', veh: '7704', mat: 'Over Gauge (Soling Stone / Boulders)', qty: 400, rate: 30.00, voucher: '03' },
      { date: '2026-08-05', veh: '9971', mat: 'Over Gauge (Soling Stone / Boulders)', qty: 400, rate: 30.00, voucher: '04' },
      { date: '2026-08-05', veh: '0848', mat: 'Over Gauge (Soling Stone / Boulders)', qty: 400, rate: 30.00, voucher: '07' },
      { date: '2026-08-05', veh: '0847', mat: 'Over Gauge (Soling Stone / Boulders)', qty: 400, rate: 30.00, voucher: '08' },
      { date: '2026-08-05', veh: '5509', mat: 'Over Gauge (Soling Stone / Boulders)', qty: 375, rate: 30.00, voucher: '05' },
      { date: '2026-08-05', veh: '2439', mat: 'Over Gauge (Soling Stone / Boulders)', qty: 375, rate: 30.00, voucher: '06' },
      { date: '2026-08-05', veh: '1471', mat: 'Over Gauge (Soling Stone / Boulders)', qty: 350, rate: 30.00, voucher: '09' },
      { date: '2026-08-05', veh: '0011', mat: 'Over Gauge (Soling Stone / Boulders)', qty: 350, rate: 30.00, voucher: '02' }
    ];

    for (const t of trips150) {
      const amount = +(t.qty * t.rate).toFixed(2);
      const ch = t.voucher ? `Voucher #${t.voucher}` : 'CH-ALM-150';
      await c.query(`
        INSERT INTO material_register (
          project_id, date, material, unit, received_qty, consumed_qty,
          rate, amount, purpose, challan_no, wbs_code,
          contractor_rep, ueed_rep, remarks, vendor_id, supplier_name,
          invoice_no, po_number, vehicle_no, site_zone, qa_status, balance_stock, grn_id,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, 'cft', $4, 0.000,
          $5, $6, 'Heavy rock soling and subgrade stabilization at Shalimar site',
          $7, 'WBS-SHAL-SOLING',
          'Shahid Khan (Site Incharge)', 'Er. Samiullah Beigh / AEE S&D-I',
          $8, $9, 'Alamdar Stone Crusher',
          '150', 'PO-KIPL-2026-0009', $10, 'Shalimar Site', 'verified', 0.00, $11,
          NOW(), NOW()
        )
      `, [projectId, t.date, t.mat, t.qty, t.rate, amount, ch,
          `Tipper #${t.veh} (${t.qty} cft) — Alamdar Stone Crusher Bill #150 — Shalimar site`,
          vendorId, t.veh, grn150Id]);
    }

    // Bill 151 Trips (2 trips)
    const trips151 = [
      { date: '2026-08-06', veh: '7704', mat: 'Stone Dust / Crushed Sand', qty: 400, rate: 30.00, voucher: '16' },
      { date: '2026-08-06', veh: '5509', mat: 'Stone Dust / Crushed Sand', qty: 400, rate: 30.00, voucher: '13' }
    ];

    for (const t of trips151) {
      const amount = +(t.qty * t.rate).toFixed(2);
      await c.query(`
        INSERT INTO material_register (
          project_id, date, material, unit, received_qty, consumed_qty,
          rate, amount, purpose, challan_no, wbs_code,
          contractor_rep, ueed_rep, remarks, vendor_id, supplier_name,
          invoice_no, po_number, vehicle_no, site_zone, qa_status, balance_stock, grn_id,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, 'cft', $4, 0.000,
          $5, $6, 'Stone dust bedding & encasement for pipeline joints at Nishat STP site',
          $7, 'WBS-SEW-DUST',
          'Shahid Khan (Site Incharge)', 'Er. Samiullah Beigh / AEE S&D-I',
          $8, $9, 'Alamdar Stone Crusher',
          '151', 'PO-KIPL-2026-0010', $10, '30 MLD STP Ishbar Nishat', 'verified', 0.00, $11,
          NOW(), NOW()
        )
      `, [projectId, t.date, t.mat, t.qty, t.rate, amount, `Voucher #${t.voucher}`,
          `Tipper #${t.veh} (${t.qty} cft) — Alamdar Stone Crusher Bill #151 — Nishat site`,
          vendorId, t.veh, grn151Id]);
    }

    // Bill 149 Trips (49 trips across Pages 1, 2, 3)
    const trips149 = [
      // Page 1
      { date: '2026-07-17', veh: '2439', mat: 'Wet Mix Macadam (WMM)', qty: 375, rate: 30.00, voucher: '' },
      { date: '2026-08-06', veh: '0848', mat: 'CTSB', qty: 400, rate: 30.00, voucher: '14' },
      { date: '2026-08-06', veh: '9971', mat: 'CTSB', qty: 400, rate: 30.00, voucher: '10' },
      { date: '2026-08-06', veh: '2439', mat: 'CTSB', qty: 375, rate: 30.00, voucher: '11' },
      { date: '2026-08-06', veh: '1471', mat: 'CTSB', qty: 350, rate: 30.00, voucher: '17' },
      { date: '2026-08-06', veh: '0847', mat: 'CTSB', qty: 400, rate: 30.00, voucher: '12' },
      { date: '2026-08-06', veh: '0011', mat: 'CTSB', qty: 350, rate: 30.00, voucher: '15' },
      { date: '2026-08-07', veh: '8703', mat: 'CTSB', qty: 400, rate: 30.00, voucher: '20' },
      { date: '2026-08-07', veh: '9340', mat: 'CTSB', qty: 400, rate: 30.00, voucher: '19' },
      { date: '2026-08-07', veh: '9971', mat: 'CTSB', qty: 400, rate: 30.00, voucher: '18' },
      { date: '2026-08-07', veh: '8759', mat: 'CTSB', qty: 400, rate: 30.00, voucher: '26' },
      { date: '2026-08-07', veh: '7704', mat: 'CTSB', qty: 400, rate: 30.00, voucher: '25' },
      { date: '2026-08-07', veh: '1005', mat: 'CTSB', qty: 375, rate: 30.00, voucher: '22' },
      { date: '2026-08-07', veh: '5509', mat: 'CTSB', qty: 400, rate: 30.00, voucher: '21' },
      { date: '2026-08-07', veh: '1471', mat: 'CTSB', qty: 350, rate: 30.00, voucher: '24' },
      { date: '2026-08-07', veh: '0011', mat: 'CTSB', qty: 350, rate: 30.00, voucher: '23' },
      { date: '2026-08-07', veh: '2439', mat: 'CTSB', qty: 375, rate: 30.00, voucher: '27' },
      { date: '2026-08-09', veh: '9886', mat: 'CTSB', qty: 600, rate: 30.00, voucher: '' },
      // Page 2
      { date: '2026-08-09', veh: '0656', mat: 'CTSB', qty: 600, rate: 30.00, voucher: '' },
      { date: '2026-08-09', veh: '9971', mat: 'CTSB', qty: 400, rate: 30.00, voucher: '' },
      { date: '2026-08-09', veh: '5509', mat: 'CTSB', qty: 400, rate: 30.00, voucher: '' },
      { date: '2026-08-09', veh: '7704', mat: 'CTSB', qty: 400, rate: 30.00, voucher: '35' },
      { date: '2026-08-09', veh: '8759', mat: 'CTSB', qty: 400, rate: 30.00, voucher: '' },
      { date: '2026-08-09', veh: '9340', mat: 'CTSB', qty: 400, rate: 30.00, voucher: '34' },
      { date: '2026-08-09', veh: '8703', mat: 'CTSB', qty: 400, rate: 30.00, voucher: '32' },
      { date: '2026-08-09', veh: '0847', mat: 'CTSB', qty: 400, rate: 30.00, voucher: '30' },
      { date: '2026-08-09', veh: '1005', mat: 'CTSB', qty: 375, rate: 30.00, voucher: '36' },
      { date: '2026-08-09', veh: '2439', mat: 'CTSB', qty: 375, rate: 30.00, voucher: '31' },
      { date: '2026-08-09', veh: '1471', mat: 'CTSB', qty: 350, rate: 30.00, voucher: '41' },
      { date: '2026-08-09', veh: '0011', mat: 'CTSB', qty: 350, rate: 30.00, voucher: '' },
      { date: '2026-08-09', veh: '9360', mat: 'CTSB', qty: 400, rate: 30.00, voucher: '' },
      { date: '2026-08-10', veh: '0663', mat: 'CTSB', qty: 400, rate: 30.00, voucher: '' },
      { date: '2026-08-10', veh: '8703', mat: 'CTSB', qty: 400, rate: 30.00, voucher: '44' },
      { date: '2026-08-10', veh: '9340', mat: 'CTSB', qty: 400, rate: 30.00, voucher: '' },
      { date: '2026-08-10', veh: '0848', mat: 'CTSB', qty: 400, rate: 30.00, voucher: '48' },
      { date: '2026-08-10', veh: '1471', mat: 'CTSB', qty: 350, rate: 30.00, voucher: '' },
      // Page 3
      { date: '2026-08-10', veh: '9360', mat: 'CTSB', qty: 400, rate: 30.00, voucher: '' },
      { date: '2026-08-10', veh: '9971', mat: 'CTSB', qty: 400, rate: 30.00, voucher: '' },
      { date: '2026-08-10', veh: '7704', mat: 'CTSB', qty: 400, rate: 30.00, voucher: '' },
      { date: '2026-08-10', veh: '0847', mat: 'CTSB', qty: 400, rate: 30.00, voucher: '49' },
      { date: '2026-08-11', veh: '0011', mat: 'CTSB', qty: 350, rate: 30.00, voucher: '' },
      { date: '2026-08-11', veh: '1005', mat: 'CTSB', qty: 375, rate: 30.00, voucher: '' },
      { date: '2026-08-11', veh: '7704', mat: 'CTSB', qty: 400, rate: 30.00, voucher: '' },
      { date: '2026-08-11', veh: '9340', mat: 'CTSB', qty: 400, rate: 30.00, voucher: '' },
      { date: '2026-08-11', veh: '0848', mat: 'CTSB', qty: 400, rate: 30.00, voucher: '' },
      { date: '2026-08-11', veh: '8703', mat: 'CTSB', qty: 400, rate: 30.00, voucher: '52' },
      { date: '2026-08-11', veh: '9360', mat: 'CTSB', qty: 400, rate: 30.00, voucher: '' },
      { date: '2026-08-11', veh: '1471', mat: 'CTSB', qty: 350, rate: 30.00, voucher: '' },
      { date: '2026-08-11', veh: '2439', mat: 'CTSB', qty: 375, rate: 30.00, voucher: '' }
    ];

    for (const t of trips149) {
      const amount = +(t.qty * t.rate).toFixed(2);
      const ch = t.voucher ? `Voucher #${t.voucher}` : 'CH-ALM-149';
      await c.query(`
        INSERT INTO material_register (
          project_id, date, material, unit, received_qty, consumed_qty,
          rate, amount, purpose, challan_no, wbs_code,
          contractor_rep, ueed_rep, remarks, vendor_id, supplier_name,
          invoice_no, po_number, vehicle_no, site_zone, qa_status, balance_stock, grn_id,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, 'cft', $4, 0.000,
          $5, $6, 'Internal road network sub-base and base course foundation at Nishat STP site',
          $7, 'WBS-ROADS-SUBBASE',
          'Shahid Khan (Site Incharge)', 'Er. Samiullah Beigh / AEE S&D-I',
          $8, $9, 'Alamdar Stone Crusher',
          '149', 'PO-KIPL-2026-0008', $10, '30 MLD STP Ishbar Nishat', 'verified', 0.00, $11,
          NOW(), NOW()
        )
      `, [projectId, t.date, t.mat, t.qty, t.rate, amount, ch,
          `Tipper #${t.veh} (${t.qty} cft) — Alamdar Stone Crusher Bill #149 — Nishat site`,
          vendorId, t.veh, grn149Id]);
    }

    // 5. Payment Requisitions
    console.log('5. Seeding Payment Requisitions (PR-2026-0006 to 0009)...');
    
    // PR 148
    const pr148Id = 'e5e4da40-570e-4b11-9e23-786000000148';
    await c.query(`
      INSERT INTO payment_requisitions (
        id, project_id, pr_number, title, pr_date, site_location, requested_by_name,
        status, total_order_cost, total_advance_paid, total_amount_to_pay, total_balance,
        procurement_status, procurement_approved_by_name, procurement_approved_at, procurement_remarks,
        accounts_status, accounts_approved_by_name, accounts_approved_at, accounts_remarks,
        notes, created_at, updated_at
      ) VALUES (
        $1, $2, 'PR-2026-0006',
        'Payment Requisition for Khakh Bajari (4,575 cft) — Alamdar Stone Crusher (Bill #148-KB-NISHT)',
        '2026-08-01', '30 MLD STP Ishbar Nishat', 'Shahid Khan (Site Incharge)',
        'approved', 80063.00, 0.00, 80063.00, 0.00,
        'approved', 'Project Manager', '2026-08-02 10:00:00+00',
        'Quantity 4,575 cft verified across 12 delivery challans at Nishat site.',
        'approved', 'Accountant', '2026-08-02 14:00:00+00',
        'Bill #148-KB-NISHT passed for RTGS to J&K Bank Khonmoh A/C 0244020100000164, IFSC JAKA0KHONMOH.',
        'Payment against Alamdar Stone Crusher Bill #148-KB-NISHT dated 01/08/2026.',
        NOW(), NOW()
      )
      ON CONFLICT (id) DO UPDATE SET total_amount_to_pay = EXCLUDED.total_amount_to_pay, status = EXCLUDED.status, updated_at = NOW()
    `, [pr148Id, projectId]);

    await c.query(`
      INSERT INTO payment_requisition_items (
        id, payment_requisition_id, sr_no, vendor_id, vendor_name, description,
        material_or_services, is_msme, total_order_cost, advance_paid, amount_to_pay,
        balance_amount, site_location, remark, against_ref, mode_of_payment, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, 1, $2, 'Alamdar Stone Crusher',
        'Supply of 4,575 cft Khakh Bajari @ 17.50 for pipe bedding at Nishat STP site',
        'Material', true, 80063.00, 0.00, 80063.00, 0.00,
        '30 MLD STP Ishbar Nishat', 'Against Bill #148-KB-NISHT dt. 01/08/2026',
        'Bill #148-KB-NISHT (GRN-2026-0007)', 'RTGS', NOW(), NOW()
      )
      ON CONFLICT DO NOTHING
    `, [pr148Id, vendorId]);

    // PR 149
    const pr149Id = 'e5e4da40-570e-4b11-9e23-786000000149';
    await c.query(`
      INSERT INTO payment_requisitions (
        id, project_id, pr_number, title, pr_date, site_location, requested_by_name,
        status, total_order_cost, total_advance_paid, total_amount_to_pay, total_balance,
        procurement_status, procurement_approved_by_name, procurement_approved_at, procurement_remarks,
        accounts_status, accounts_approved_by_name, accounts_approved_at, accounts_remarks,
        notes, created_at, updated_at
      ) VALUES (
        $1, $2, 'PR-2026-0007',
        'Payment Requisition for Wet Mix & CTSB Sub-Base (19,350 cft) — Alamdar Stone Crusher (Bill #149)',
        '2026-08-11', '30 MLD STP Ishbar Nishat', 'Shahid Khan (Site Incharge)',
        'approved', 580500.00, 0.00, 580500.00, 0.00,
        'approved', 'Project Manager', '2026-08-12 11:00:00+00',
        'Quantity 19,350 cft verified across 49 tipper delivery vouchers at Nishat site.',
        'approved', 'Accountant', '2026-08-12 15:30:00+00',
        'Bill #149 verified. Subtotal ₹5,80,500.00 passed for RTGS to J&K Bank Khonmoh A/C 0244020100000164.',
        'Payment against Alamdar Stone Crusher Bill #149 dated 11/08/2026.',
        NOW(), NOW()
      )
      ON CONFLICT (id) DO UPDATE SET total_amount_to_pay = EXCLUDED.total_amount_to_pay, status = EXCLUDED.status, updated_at = NOW()
    `, [pr149Id, projectId]);

    await c.query(`
      INSERT INTO payment_requisition_items (
        id, payment_requisition_id, sr_no, vendor_id, vendor_name, description,
        material_or_services, is_msme, total_order_cost, advance_paid, amount_to_pay,
        balance_amount, site_location, remark, against_ref, mode_of_payment, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, 1, $2, 'Alamdar Stone Crusher',
        'Supply of 19,350 cft CTSB & Wet Mix @ 30.00 for Nishat STP internal road network',
        'Material', true, 580500.00, 0.00, 580500.00, 0.00,
        '30 MLD STP Ishbar Nishat', 'Against Bill #149 dt. 11/08/2026',
        'Bill #149 (GRN-2026-0008)', 'RTGS', NOW(), NOW()
      )
      ON CONFLICT DO NOTHING
    `, [pr149Id, vendorId]);

    // PR 150
    const pr150Id = 'e5e4da40-570e-4b11-9e23-786000000150';
    await c.query(`
      INSERT INTO payment_requisitions (
        id, project_id, pr_number, title, pr_date, site_location, requested_by_name,
        status, total_order_cost, total_advance_paid, total_amount_to_pay, total_balance,
        procurement_status, procurement_approved_by_name, procurement_approved_at, procurement_remarks,
        accounts_status, accounts_approved_by_name, accounts_approved_at, accounts_remarks,
        notes, created_at, updated_at
      ) VALUES (
        $1, $2, 'PR-2026-0008',
        'Payment Requisition for Over Gauge Soling (6,200 cft) — Alamdar Stone Crusher (Bill #150)',
        '2026-08-11', 'Shalimar Site', 'Shahid Khan (Site Incharge)',
        'approved', 186000.00, 0.00, 186000.00, 0.00,
        'approved', 'Project Manager', '2026-08-12 11:30:00+00',
        'Quantity 6,200 cft verified across 16 delivery trips at Shalimar site.',
        'approved', 'Accountant', '2026-08-12 16:00:00+00',
        'Bill #150 verified. Total ₹1,86,000.00 passed for RTGS to J&K Bank Khonmoh A/C 0244020100000164.',
        'Payment against Alamdar Stone Crusher Bill #150 dated 11/08/2026.',
        NOW(), NOW()
      )
      ON CONFLICT (id) DO UPDATE SET total_amount_to_pay = EXCLUDED.total_amount_to_pay, status = EXCLUDED.status, updated_at = NOW()
    `, [pr150Id, projectId]);

    await c.query(`
      INSERT INTO payment_requisition_items (
        id, payment_requisition_id, sr_no, vendor_id, vendor_name, description,
        material_or_services, is_msme, total_order_cost, advance_paid, amount_to_pay,
        balance_amount, site_location, remark, against_ref, mode_of_payment, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, 1, $2, 'Alamdar Stone Crusher',
        'Supply of 6,200 cft Over Gauge rock soling @ 30.00 for Shalimar site subgrade',
        'Material', true, 186000.00, 0.00, 186000.00, 0.00,
        'Shalimar Site', 'Against Bill #150 dt. 11/08/2026',
        'Bill #150 (GRN-2026-0009)', 'RTGS', NOW(), NOW()
      )
      ON CONFLICT DO NOTHING
    `, [pr150Id, vendorId]);

    // PR 151
    const pr151Id = 'e5e4da40-570e-4b11-9e23-786000000151';
    await c.query(`
      INSERT INTO payment_requisitions (
        id, project_id, pr_number, title, pr_date, site_location, requested_by_name,
        status, total_order_cost, total_advance_paid, total_amount_to_pay, total_balance,
        procurement_status, procurement_approved_by_name, procurement_approved_at, procurement_remarks,
        accounts_status, accounts_approved_by_name, accounts_approved_at, accounts_remarks,
        notes, created_at, updated_at
      ) VALUES (
        $1, $2, 'PR-2026-0009',
        'Payment Requisition for Stone Dust (800 cft) — Alamdar Stone Crusher (Bill #151)',
        '2026-08-11', '30 MLD STP Ishbar Nishat', 'Shahid Khan (Site Incharge)',
        'approved', 24000.00, 0.00, 24000.00, 0.00,
        'approved', 'Project Manager', '2026-08-12 11:45:00+00',
        'Quantity 800 cft verified across 2 tipper delivery vouchers at Nishat site.',
        'approved', 'Accountant', '2026-08-12 16:15:00+00',
        'Bill #151 verified. Total ₹24,000.00 passed for RTGS to J&K Bank Khonmoh A/C 0244020100000164.',
        'Payment against Alamdar Stone Crusher Bill #151 dated 11/08/2026.',
        NOW(), NOW()
      )
      ON CONFLICT (id) DO UPDATE SET total_amount_to_pay = EXCLUDED.total_amount_to_pay, status = EXCLUDED.status, updated_at = NOW()
    `, [pr151Id, projectId]);

    await c.query(`
      INSERT INTO payment_requisition_items (
        id, payment_requisition_id, sr_no, vendor_id, vendor_name, description,
        material_or_services, is_msme, total_order_cost, advance_paid, amount_to_pay,
        balance_amount, site_location, remark, against_ref, mode_of_payment, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, 1, $2, 'Alamdar Stone Crusher',
        'Supply of 800 cft Stone Dust @ 30.00 for Nishat STP pipe bedding',
        'Material', true, 24000.00, 0.00, 24000.00, 0.00,
        '30 MLD STP Ishbar Nishat', 'Against Bill #151 dt. 11/08/2026',
        'Bill #151 (GRN-2026-0010)', 'RTGS', NOW(), NOW()
      )
      ON CONFLICT DO NOTHING
    `, [pr151Id, vendorId]);

    // 6. Expenses (Vendor Bills)
    console.log('6. Seeding Expenses for all 4 Bills...');
    const expenseBills = [
      { id: '1111da40-570e-4b11-9e23-786000000148', no: '148-KB-NISHT', date: '2026-08-01', gross: 80062.50, gst: 0.00, net: 80063.00, desc: 'Supply of 4,575 cft Khakh Bajari for 30 MLD STP Nishat site trench bedding' },
      { id: '1111da40-570e-4b11-9e23-786000000149', no: '149', date: '2026-08-11', gross: 580500.00, gst: 0.00, net: 580500.00, desc: 'Supply of 19,350 cft Wet Mix & CTSB for 30 MLD STP Nishat road network sub-base' },
      { id: '1111da40-570e-4b11-9e23-786000000150', no: '150', date: '2026-08-11', gross: 186000.00, gst: 0.00, net: 186000.00, desc: 'Supply of 6,200 cft Over Gauge rock soling for Shalimar site subgrade stabilization' },
      { id: '1111da40-570e-4b11-9e23-786000000151', no: '151', date: '2026-08-11', gross: 24000.00, gst: 0.00, net: 24000.00, desc: 'Supply of 800 cft Stone Dust for 30 MLD STP Nishat pipe encasement' }
    ];

    for (const b of expenseBills) {
      await c.query(`
        INSERT INTO expenses (
          id, project_id, vendor_id, date, description, category,
          bill_no, bill_date, gross_amount, gst_pct, gst_amount, cgst_amount, sgst_amount, igst_amount,
          gst_type, itc_claimed, tds_pct, tds_amount, net_payable, paid_amount, payment_mode,
          status, approved_by, remarks, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, 'material',
          $6, $4, $7, 0.00, $8, 0.00, 0.00, 0.00,
          'intrastate', true, 0.00, 0.00, $9, 0.00, 'RTGS',
          'approved', 'Accountant',
          $10, NOW(), NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          gross_amount = EXCLUDED.gross_amount,
          net_payable = EXCLUDED.net_payable,
          status = EXCLUDED.status,
          updated_at = NOW()
      `, [b.id, projectId, vendorId, b.date, b.desc, b.no, b.gross, b.gst, b.net,
          `Verified against delivery challans and statement of account (Ledger balance ₹8,70,563.00 Dr). RTGS to J&K Bank Khonmoh A/C 0244020100000164.`]);
    }

    // 7. Site Diaries (Auto-generating across all 10 dates)
    console.log('7. Auto-generating & Updating Site Diaries across all 10 dates...');
    const diaryData = [
      {
        date: '2026-07-17',
        mats: [{ material: 'Wet Mix Macadam (WMM)', quantity: 375, unit: 'cft', supplier: 'Alamdar Stone Crusher (Bill #149, Tipper #2439)' }],
        work: [{ zone: '30 MLD STP Ishbar Nishat', activity: 'Trial patch laying and compaction of Wet Mix Macadam for western access road', quantity: 375, unit: 'cft', remarks: 'Tipper #2439 (375 cft) laid with vibratory roller' }],
        weather: 'sunny', minT: 17, maxT: 30, rain: 0,
        sk: 4, unsk: 12, sup: 2,
        eq: [{"type": "Vibratory Roller", "count": 1, "hours": 4, "remarks": "WMM compaction"}, {"type": "Water Tanker", "count": 1, "hours": 3, "remarks": "Moisture conditioning"}]
      },
      {
        date: '2026-07-30',
        mats: [{ material: 'Khak Bajri', quantity: 1825, unit: 'cft', supplier: 'Alamdar Stone Crusher (Bill #148-KB-NISHT, 5 Tippers)' }],
        work: [{ zone: '30 MLD STP Ishbar Nishat', activity: 'Pipe trench bed preparation and granular bedding for internal sewer collection line', quantity: 1825, unit: 'cft', remarks: '5 tipper loads (#5509, #2439, #1005, #0011, #1471) laid and hand-tamped' }],
        weather: 'sunny', minT: 18, maxT: 31, rain: 0,
        sk: 6, unsk: 14, sup: 2,
        eq: [{"type": "Plate Compactor", "count": 2, "hours": 6, "remarks": "Trench bedding compaction"}]
      },
      {
        date: '2026-08-01',
        mats: [{ material: 'Khak Bajri', quantity: 2750, unit: 'cft', supplier: 'Alamdar Stone Crusher (Bill #148-KB-NISHT, 7 Tippers)' }],
        work: [{ zone: '30 MLD STP Ishbar Nishat', activity: 'Sewer pipe surround encasement and trench backfilling with granular Khakh Bajari', quantity: 2750, unit: 'cft', remarks: '7 tippers (#9360, #0663, #8759, #5509, #2439, #9971, #9340) backfilled' }],
        weather: 'cloudy', minT: 19, maxT: 29, rain: 0,
        sk: 5, unsk: 15, sup: 2,
        eq: [{"type": "JCB 3DX", "count": 1, "hours": 7, "remarks": "Backfilling trench"}, {"type": "Plate Compactor", "count": 2, "hours": 6, "remarks": "Tamping"}]
      },
      {
        date: '2026-08-04',
        mats: [{ material: 'Over Gauge (Soling Stone / Boulders)', quantity: 2750, unit: 'cft', supplier: 'Alamdar Stone Crusher (Bill #150, 7 Tippers)' }],
        work: [{ zone: 'Shalimar Site', activity: 'Heavy rock soling hand-packing and subgrade stabilization for marshy ground foundation', quantity: 2750, unit: 'cft', remarks: '7 tipper loads (#9971, #5509, #7704, #0848, #0847, #2439, #9340) laid and rolled' }],
        weather: 'sunny', minT: 18, maxT: 32, rain: 0,
        sk: 6, unsk: 18, sup: 2,
        eq: [{"type": "Static Roller 10T", "count": 1, "hours": 8, "remarks": "Boulders keying & rolling"}, {"type": "JCB", "count": 1, "hours": 5, "remarks": "Spreading"}]
      },
      {
        date: '2026-08-05',
        mats: [{ material: 'Over Gauge (Soling Stone / Boulders)', quantity: 3450, unit: 'cft', supplier: 'Alamdar Stone Crusher (Bill #150, 9 Tippers)' }],
        work: [{ zone: 'Shalimar Site', activity: 'Heavy boulder soling completion and interlocking compaction with stone spalls', quantity: 3450, unit: 'cft', remarks: '9 tipper loads (#9360, #7704, #9971, #0848, #0847, #5509, #2439, #1471, #0011) keyed in' }],
        weather: 'sunny', minT: 19, maxT: 32.5, rain: 0,
        sk: 6, unsk: 20, sup: 2,
        eq: [{"type": "Static Roller 10T", "count": 1, "hours": 8, "remarks": "Soling consolidation"}, {"type": "Vibratory Roller", "count": 1, "hours": 4, "remarks": "Surface locking"}]
      },
      {
        date: '2026-08-06',
        mats: [
          { material: 'CTSB', quantity: 2275, unit: 'cft', supplier: 'Alamdar Stone Crusher (Bill #149, 6 Tippers)' },
          { material: 'Stone Dust / Crushed Sand', quantity: 800, unit: 'cft', supplier: 'Alamdar Stone Crusher (Bill #151, 2 Tippers)' }
        ],
        work: [
          { zone: '30 MLD STP Ishbar Nishat', activity: 'CTSB sub-base spreading and compaction for internal loop road (2,275 cft)', quantity: 2275, unit: 'cft', remarks: '6 tippers (#0848, #9971, #2439, #1471, #0847, #0011) spread and compacted' },
          { zone: '30 MLD STP Ishbar Nishat', activity: 'Stone dust bedding around precast manhole chambers and pipes (800 cft)', quantity: 800, unit: 'cft', remarks: '2 tippers (#7704, #5509) used for joint cushions' }
        ],
        weather: 'sunny', minT: 18, maxT: 31, rain: 0,
        sk: 5, unsk: 16, sup: 2,
        eq: [{"type": "Motor Grader", "count": 1, "hours": 6, "remarks": "CTSB leveling"}, {"type": "Vibratory Roller", "count": 1, "hours": 8, "remarks": "Sub-base rolling"}, {"type": "Water Tanker", "count": 1, "hours": 6, "remarks": "Moisture conditioning"}]
      },
      {
        date: '2026-08-07',
        mats: [{ material: 'CTSB', quantity: 3850, unit: 'cft', supplier: 'Alamdar Stone Crusher (Bill #149, 10 Tippers)' }],
        work: [{ zone: '30 MLD STP Ishbar Nishat', activity: 'CTSB layer-1 spreading, profile grading, watering and high-density compaction', quantity: 3850, unit: 'cft', remarks: '10 tipper loads (#8703, #9340, #9971, #8759, #7704, #1005, #5509, #1471, #0011, #2439) laid' }],
        weather: 'sunny', minT: 17.5, maxT: 30, rain: 0,
        sk: 6, unsk: 16, sup: 2,
        eq: [{"type": "Motor Grader", "count": 1, "hours": 7, "remarks": "Grade profiling"}, {"type": "Vibratory Roller", "count": 1, "hours": 8, "remarks": "Heavy compaction"}]
      },
      {
        date: '2026-08-09',
        mats: [{ material: 'CTSB', quantity: 5850, unit: 'cft', supplier: 'Alamdar Stone Crusher (Bill #149, 14 Tippers)' }],
        work: [{ zone: '30 MLD STP Ishbar Nishat', activity: 'Massive CTSB laying for road carriage-way and sub-station access approach', quantity: 5850, unit: 'cft', remarks: '14 tippers received, spread with grader and compacted in 150mm layers' }],
        weather: 'sunny', minT: 18, maxT: 31.5, rain: 0,
        sk: 6, unsk: 18, sup: 2,
        eq: [{"type": "Motor Grader", "count": 1, "hours": 8, "remarks": "Spreading CTSB"}, {"type": "Vibratory Roller", "count": 2, "hours": 8, "remarks": "Tandem compaction"}, {"type": "Water Tanker", "count": 1, "hours": 8, "remarks": "Optimum moisture"}]
      },
      {
        date: '2026-08-10',
        mats: [{ material: 'CTSB', quantity: 3550, unit: 'cft', supplier: 'Alamdar Stone Crusher (Bill #149, 9 Tippers)' }],
        work: [{ zone: '30 MLD STP Ishbar Nishat', activity: 'CTSB upper lift laying, crown shaping and camber establishment for internal network', quantity: 3550, unit: 'cft', remarks: '9 tipper loads spread and compacted to required density' }],
        weather: 'cloudy', minT: 19, maxT: 29.5, rain: 0,
        sk: 5, unsk: 15, sup: 2,
        eq: [{"type": "Motor Grader", "count": 1, "hours": 7, "remarks": "Camber profiling"}, {"type": "Vibratory Roller", "count": 1, "hours": 8, "remarks": "Finish rolling"}]
      },
      {
        date: '2026-08-11',
        mats: [{ material: 'CTSB', quantity: 3450, unit: 'cft', supplier: 'Alamdar Stone Crusher (Bill #149, 9 Tippers)' }],
        work: [{ zone: '30 MLD STP Ishbar Nishat', activity: 'Final CTSB lift grading, hard rolling and field density test verification (sand replacement)', quantity: 3450, unit: 'cft', remarks: '9 tipper loads completed; FDD verified >98% MDD' }],
        weather: 'sunny', minT: 18, maxT: 30.5, rain: 0,
        sk: 6, unsk: 16, sup: 2,
        eq: [{"type": "Motor Grader", "count": 1, "hours": 7, "remarks": "Final leveling"}, {"type": "Vibratory Roller", "count": 1, "hours": 8, "remarks": "Proof rolling"}, {"type": "Water Tanker", "count": 1, "hours": 6, "remarks": "Surface moistening"}]
      }
    ];

    for (const d of diaryData) {
      const existing = await c.query("SELECT id, materials_received, work_done FROM site_diaries WHERE project_id = $1 AND date = $2", [projectId, d.date]);
      
      if (existing.rows.length > 0) {
        const curMats = Array.isArray(existing.rows[0].materials_received) ? existing.rows[0].materials_received : [];
        const curWork = Array.isArray(existing.rows[0].work_done) ? existing.rows[0].work_done : [];
        
        // Filter out any prior entries from these bills
        const filteredMats = curMats.filter(m => !m.supplier?.includes('148') && !m.supplier?.includes('149') && !m.supplier?.includes('150') && !m.supplier?.includes('151'));
        const filteredWork = curWork.filter(w => !w.remarks?.includes('tipper') && !w.remarks?.includes('CTSB') && !w.remarks?.includes('Soling'));

        await c.query(`
          UPDATE site_diaries
          SET 
            materials_received = $1::jsonb,
            work_done = $2::jsonb,
            labour_skilled = GREATEST(labour_skilled, $4),
            labour_unskilled = GREATEST(labour_unskilled, $5),
            labour_supervisory = GREATEST(labour_supervisory, $6),
            labour_total = GREATEST(labour_total, $7),
            updated_at = NOW()
          WHERE id = $3
        `, [
          JSON.stringify([...filteredMats, ...d.mats]),
          JSON.stringify([...filteredWork, ...d.work]),
          existing.rows[0].id,
          d.sk, d.unsk, d.sup, (d.sk + d.unsk + d.sup)
        ]);
        console.log(`  Updated existing site diary for ${d.date}`);
      } else {
        await c.query(`
          INSERT INTO site_diaries (
            id, project_id, date, submitted_by, weather_morning, weather_afternoon,
            temp_min, temp_max, rainfall_mm, work_stopped_weather, hours_lost,
            labour_skilled, labour_unskilled, labour_supervisory, labour_total,
            equipment, work_done, materials_received, visitors, issues_faced,
            instructions_given, next_day_plan, eot_claim, status, created_at, updated_at
          ) VALUES (
            gen_random_uuid(), $1, $2, 'Shahid Khan (Site Incharge)',
            $3, $4, $5, $6, $7, false, 0,
            $8, $9, $10, $11,
            $12::jsonb, $13::jsonb, $14::jsonb,
            '[]'::jsonb, 'Smooth site operations in favorable summer weather.',
            'Ensure optimum moisture content before rolling. Maintain compacted layer thickness and check grades.',
            'Continue site sub-base and structural works as per master schedule.',
            false, 'approved', NOW(), NOW()
          )
        `, [
          projectId, d.date, d.weather, d.weather, d.minT, d.maxT, d.rain,
          d.sk, d.unsk, d.sup, (d.sk + d.unsk + d.sup),
          JSON.stringify(d.eq),
          JSON.stringify(d.work),
          JSON.stringify(d.mats)
        ]);
        console.log(`  Created new approved site diary for ${d.date}`);
      }
    }

    await c.query('COMMIT');
    console.log('\nSUCCESS: All 4 bills, 79 delivery trips, 4 POs, 4 GRNs, 4 PRs, 4 Expenses, and 10 Site Diaries seeded successfully!');
  } catch (err) {
    await c.query('ROLLBACK');
    console.error('ERROR during seeding (rolled back):', err);
    throw err;
  } finally {
    await c.end();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
