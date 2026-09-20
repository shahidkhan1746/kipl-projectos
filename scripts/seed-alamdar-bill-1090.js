/**
 * Seeds Alamdar Stone Crusher Bill #1090 (Dated 29/06/2026 - ₹2,95,313.00)
 * Across Vendors, Procurement (PO & GRN), Material Register, Payment Requisitions,
 * Accounting Expenses, and Site Diaries.
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
    const projectId = '4a5176c7-0f53-42cc-bbd8-1a7259648a96';
    const vendorId = 'b99e1d96-575d-4213-8d7d-a4be9808e355';

    // 1. Master Dropdown Options
    console.log('1. Updating Master Dropdown Options for CTSB & Wet Mix...');
    const dropdownOptions = [
      {
        dropdown_type: 'material',
        label: 'CTSB (Crushed / Cement Treated Sub-Base)',
        value: 'CTSB',
        category: 'aggregate_sand',
        unit: 'cft',
        spec: 'Crushed / cement treated sub-base material for road base and pavement foundations',
        metadata: JSON.stringify({ aliases: ['ctsb', 'c.t.s.b', 'crushed treated sub base', 'cement treated sub base', 'crushed sub-base'] }),
        display_order: 12
      },
      {
        dropdown_type: 'material',
        label: 'Wet Mix Macadam (WMM)',
        value: 'Wet Mix Macadam (WMM)',
        category: 'aggregate_sand',
        unit: 'cft',
        spec: 'Premixed graded aggregate and filler with controlled moisture for pavement sub-base/base',
        metadata: JSON.stringify({ aliases: ['wet mix', 'wetmix', 'wmm', 'w.m.m', 'wet mix macadam'] }),
        display_order: 13
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

    // 2. Update Vendor Bank Account with exact Account Number 0244020100000164
    console.log('2. Updating Vendor Bank Account Details...');
    await c.query(`
      UPDATE vendors
      SET 
        trade_name = 'Alamdar Stone Crusher',
        gstin = '01ABMFA5025A1Z9',
        pan = 'ABMFA5025A',
        phone = '9797844511',
        email = 'allamdarstonecrusher786@gmail.com',
        address = 'Wuyan Pampore-191102 Kashmir, 01-Jammu & Kashmir',
        bank_account = '{"bank": "J&K Bank", "branch": "Khonmoh", "ifsc": "JAKA0KHONMOH", "accountNo": "0244020100000164"}'::jsonb,
        tds_applicable = true,
        tds_rate = 2.00,
        is_active = true,
        updated_at = NOW()
      WHERE id = $1
    `, [vendorId]);

    // 3. Purchase Order (PO-KIPL-2026-0005)
    console.log('3. Seeding Purchase Order PO-KIPL-2026-0005...');
    const poId = 'b2b4da40-570e-4b11-9e23-786000001090';
    const poItemsJson = [
      {
        item_description: 'Wet Mix Macadam (WMM)',
        hsn_code: '251710',
        quantity: 375,
        unit: 'cft',
        unit_rate: 30.00,
        taxable_amount: 11250.00,
        gst_rate: 5,
        gst_amount: 562.50,
        total_amount: 11812.50
      },
      {
        item_description: 'CTSB (Crushed / Cement Treated Sub-Base)',
        hsn_code: '251710',
        quantity: 9000,
        unit: 'cft',
        unit_rate: 30.00,
        taxable_amount: 270000.00,
        gst_rate: 5,
        gst_amount: 13500.00,
        total_amount: 283500.00
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
        $21, $22, $23, $24, $25,
        $21, $25, 0.00, 0.50, $26, $26,
        'completed', 'Procurement Head Office', 'Project Manager',
        'Procurement Head Office', 'Project Manager', $27, $27,
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
      poId, projectId, 'PO-KIPL-2026-0005', '2026-05-25', '2026-06-30',
      vendorId, 'Alamdar Stone Crusher', '9797844511', 'allamdarstonecrusher786@gmail.com', '01ABMFA5025A1Z9', 'Wuyan Pampore-191102 Kashmir',
      'Supply of Wet Mix Macadam (WMM) and CTSB for Pavement Sub-Base at 30 MLD STP Ishbar Nishat', 'aggregate_sand', 'Internal Roads, Pavements & Sub-Base Construction',
      '30 MLD STP Site, Gupt Ganga Ishbar Nishat, Srinagar - 191121', 'M/s Khilari Infrastructure Pvt. Ltd., 30 MLD STP Ishbar Nishat Srinagar', '30 MLD STP Site, Gupt Ganga Ishbar Nishat, Srinagar - 191121',
      '30 days against verified site delivery challans & GST invoice', 'FOR Nishat STP Site, Srinagar', JSON.stringify(poItemsJson),
      281250.00, 7031.25, 7031.25, 0.00, 14062.50, 295313.00,
      'Rate contract for sub-base materials: Wet Mix @ ₹30.00/cft and CTSB @ ₹30.00/cft delivered to Nishat site against Bill #1090.'
    ]);

    const poItem1 = 'c3c4da40-570e-4b11-9e23-786000001091';
    const poItem2 = 'c3c4da40-570e-4b11-9e23-786000001092';

    await c.query(`
      INSERT INTO purchase_order_items (
        id, purchase_order_id, item_description, hsn_code, quantity, unit,
        unit_rate, discount_percent, gst_rate, taxable_amount, gst_amount, total_amount, received_qty,
        created_at, updated_at
      ) VALUES
      ($1, $2, 'Wet Mix Macadam (WMM)', '251710', 375.000, 'cft', 30.00, 0.00, 5.00, 11250.00, 562.50, 11812.50, 375.000, NOW(), NOW())
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
      ($1, $2, 'CTSB (Crushed / Cement Treated Sub-Base)', '251710', 9000.000, 'cft', 30.00, 0.00, 5.00, 270000.00, 13500.00, 283500.00, 9000.000, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        quantity = EXCLUDED.quantity,
        received_qty = EXCLUDED.received_qty,
        total_amount = EXCLUDED.total_amount,
        updated_at = NOW()
    `, [poItem2, poId]);

    // 4. Goods Receipt Note (GRN-2026-0004)
    console.log('4. Seeding Goods Receipt Note GRN-2026-0004...');
    const grnId = 'd4d4da40-570e-4b11-9e23-786000001090';

    await c.query(`
      INSERT INTO goods_receipt_notes (
        id, project_id, grn_number, purchase_order_id, received_date,
        challan_number, invoice_number, vehicle_number, received_by_name, remarks,
        write_to_material_register, created_at, updated_at
      ) VALUES
      ($1, $2, 'GRN-2026-0004', $3, '2026-06-28', 'CH-ALM-202606', '1090',
       '2439, 9971, 9886, 0656, 5507, 9360, 8759, 1916',
       'Shahid Khan (Site Incharge)',
       'Received 18 tippers (9,375 cft total: 375 cft Wet Mix + 9,000 cft CTSB) from Alamdar Stone Crusher at Nishat STP site.',
       true, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        received_date = EXCLUDED.received_date,
        invoice_number = EXCLUDED.invoice_number,
        vehicle_number = EXCLUDED.vehicle_number,
        updated_at = NOW()
    `, [grnId, projectId, poId]);

    await c.query(`
      INSERT INTO goods_receipt_note_items (
        id, grn_id, purchase_order_item_id, item_description, received_qty, unit, remarks, created_at, updated_at
      ) VALUES
      (gen_random_uuid(), $1, $2, 'Wet Mix Macadam (WMM)', 375.000, 'cft',
       '1 tipper trip: 375 cft (#2439) delivered to Nishat site on 01/06/2026', NOW(), NOW())
      ON CONFLICT DO NOTHING
    `, [grnId, poItem1]);

    await c.query(`
      INSERT INTO goods_receipt_note_items (
        id, grn_id, purchase_order_item_id, item_description, received_qty, unit, remarks, created_at, updated_at
      ) VALUES
      (gen_random_uuid(), $1, $2, 'CTSB (Crushed / Cement Treated Sub-Base)', 9000.000, 'cft',
       '17 tipper trips: 9,000 cft delivered between 08/06/2026 and 28/06/2026 at Nishat site', NOW(), NOW())
      ON CONFLICT DO NOTHING
    `, [grnId, poItem2]);

    // 5. Material Register (Clause 55 Site Register - 18 Granular Delivery Trips)
    console.log('5. Seeding Material Register (Clause 55 - 18 Trips)...');
    await c.query("DELETE FROM material_register WHERE invoice_no = '1090' OR remarks LIKE '%Bill #1090%'");

    const trips = [
      { date: '2026-06-01', veh: '2439', mat: 'Wet Mix Macadam (WMM)', qty: 375 },
      { date: '2026-06-08', veh: '9971', mat: 'CTSB', qty: 400 },
      { date: '2026-06-21', veh: '9886', mat: 'CTSB', qty: 600 },
      { date: '2026-06-21', veh: '0656', mat: 'CTSB', qty: 600 },
      { date: '2026-06-21', veh: '5507', mat: 'CTSB', qty: 600 },
      { date: '2026-06-21', veh: '9971', mat: 'CTSB', qty: 400 },
      { date: '2026-06-22', veh: '9886', mat: 'CTSB', qty: 600 },
      { date: '2026-06-22', veh: '0656', mat: 'CTSB', qty: 600 },
      { date: '2026-06-22', veh: '5507', mat: 'CTSB', qty: 600 },
      { date: '2026-06-22', veh: '9360', mat: 'CTSB', qty: 400 },
      { date: '2026-06-23', veh: '0656', mat: 'CTSB', qty: 600 },
      { date: '2026-06-25', veh: '9971', mat: 'CTSB', qty: 400 },
      { date: '2026-06-28', veh: '0656', mat: 'CTSB', qty: 600 },
      { date: '2026-06-28', veh: '5507', mat: 'CTSB', qty: 600 },
      { date: '2026-06-28', veh: '8759', mat: 'CTSB', qty: 400 },
      { date: '2026-06-28', veh: '9886', mat: 'CTSB', qty: 600 },
      { date: '2026-06-28', veh: '1916', mat: 'CTSB', qty: 600 },
      { date: '2026-06-28', veh: '9971', mat: 'CTSB', qty: 400 }
    ];

    for (const t of trips) {
      const amount = +(t.qty * 30.00).toFixed(2);
      await c.query(`
        INSERT INTO material_register (
          project_id, date, material, unit, received_qty, consumed_qty,
          rate, amount, purpose, challan_no, wbs_code,
          contractor_rep, ueed_rep, remarks, vendor_id, supplier_name,
          invoice_no, po_number, vehicle_no, site_zone, qa_status, balance_stock, grn_id,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, 'cft', $4, 0.000,
          30.00, $5, 'Internal road pavement sub-base and base course foundation at Nishat STP site',
          'CH-ALM-202606', 'WBS-ROADS-SUBBASE',
          'Shahid Khan (Site Incharge)', 'Er. Samiullah Beigh / AEE S&D-I',
          $6, $7, 'Alamdar Stone Crusher',
          '1090', 'PO-KIPL-2026-0005', $8, '30 MLD STP Ishbar Nishat', 'verified', 0.00, $9,
          NOW(), NOW()
        )
      `, [
        projectId, t.date, t.mat, t.qty, amount,
        `Tipper #${t.veh} (${t.qty} cft) — Alamdar Stone Crusher Bill #1090 — Nishat STP site sub-base`,
        vendorId, t.veh, grnId
      ]);
    }

    // 6. Payment Requisition (PR-2026-0003)
    console.log('6. Seeding Payment Requisition PR-2026-0003...');
    const prId = 'e5e4da40-570e-4b11-9e23-786000001090';
    const prItemId = 'f6f4da40-570e-4b11-9e23-786000001090';

    await c.query(`
      INSERT INTO payment_requisitions (
        id, project_id, pr_number, title, pr_date, site_location, requested_by_name,
        status, total_order_cost, total_advance_paid, total_amount_to_pay, total_balance,
        procurement_status, procurement_approved_by_name, procurement_approved_at, procurement_remarks,
        accounts_status, accounts_approved_by_name, accounts_approved_at, accounts_remarks,
        notes, created_at, updated_at
      ) VALUES (
        $1, $2, 'PR-2026-0003',
        'Payment Requisition for Wet Mix & CTSB Sub-Base — Alamdar Stone Crusher (Bill #1090)',
        '2026-06-30', '30 MLD STP Ishbar Nishat', 'Shahid Khan (Site Incharge)',
        'approved', 295313.00, 0.00, 295313.00, 0.00,
        'approved', 'Project Manager', '2026-07-01 10:30:00+00',
        'Quantity verified against 18 tipper delivery challans & site measurement at Nishat STP site. Recommended for payment.',
        'approved', 'Accountant', '2026-07-01 14:15:00+00',
        'Bill #1090 verified. Subtotal ₹2,81,250 + CGST ₹7,031.25 + SGST ₹7,031.25 = ₹2,95,313.00. Bank: J&K Bank Khonmoh A/C 0244020100000164, IFSC JAKA0KHONMOH. Passed for RTGS.',
        'Payment against Alamdar Stone Crusher Bill #1090 dated 29/06/2026. Deliveries between 01/06/2026 and 28/06/2026.',
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
        'Supply of Wet Mix Macadam (375 cft @ 30.00) & CTSB (9,000 cft @ 30.00) for Nishat STP site pavement sub-base',
        'Material', true, 295313.00, 0.00, 295313.00, 0.00,
        '30 MLD STP Ishbar Nishat', 'Against Tax Invoice Bill #1090 dt. 29/06/2026',
        'Bill #1090 (GRN-2026-0004)', 'RTGS', NOW(), NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        amount_to_pay = EXCLUDED.amount_to_pay,
        balance_amount = EXCLUDED.balance_amount,
        updated_at = NOW()
    `, [prItemId, prId, vendorId]);

    // 7. Expenses (Vendor Bill)
    console.log('7. Seeding Expenses Bill #1090...');
    const expenseId = '1111da40-570e-4b11-9e23-786000001090';

    await c.query(`
      INSERT INTO expenses (
        id, project_id, vendor_id, date, description, category,
        bill_no, bill_date, gross_amount, gst_pct, gst_amount, cgst_amount, sgst_amount, igst_amount,
        gst_type, itc_claimed, tds_pct, tds_amount, net_payable, paid_amount, payment_mode,
        status, approved_by, remarks, created_at, updated_at
      ) VALUES (
        $1, $2, $3, '2026-06-29',
        'Material supply: 375 cft Wet Mix + 9,000 cft CTSB for 30 MLD STP Ishbar Nishat pavement sub-base (Bill #1090)',
        'material', '1090', '2026-06-29',
        281250.00, 5.00, 14062.50, 7031.25, 7031.25, 0.00,
        'intrastate', true, 0.00, 0.00, 295313.00, 0.00, 'RTGS',
        'approved', 'Accountant',
        '18 tipper trips verified at Nishat STP site against delivery challans. RTGS to J&K Bank Khonmoh A/C 0244020100000164 (IFSC: JAKA0KHONMOH).',
        NOW(), NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        gross_amount = EXCLUDED.gross_amount,
        net_payable = EXCLUDED.net_payable,
        status = EXCLUDED.status,
        updated_at = NOW()
    `, [expenseId, projectId, vendorId]);

    // 8. Site Diaries
    console.log('8. Updating Site Diaries across June 2026 delivery dates...');
    const diaryDates = [
      { date: '2026-06-01', mat: 'Wet Mix Macadam (WMM)', qty: 375, trips: 1, act: 'Internal road sub-base preparation and WMM compaction' },
      { date: '2026-06-08', mat: 'CTSB', qty: 400, trips: 1, act: 'Sub-base spreading and leveling' },
      { date: '2026-06-21', mat: 'CTSB', qty: 2200, trips: 4, act: 'CTSB laying and heavy roller compaction for road sub-grade' },
      { date: '2026-06-22', mat: 'CTSB', qty: 2200, trips: 4, act: 'CTSB spreading, leveling and density testing' },
      { date: '2026-06-23', mat: 'CTSB', qty: 600, trips: 1, act: 'Approach road sub-base widening' },
      { date: '2026-06-25', mat: 'CTSB', qty: 400, trips: 1, act: 'Pavement foundation course preparation' },
      { date: '2026-06-28', mat: 'CTSB', qty: 3200, trips: 6, act: 'Final lift CTSB laying, grading and watering for Nishat STP internal network' }
    ];

    for (const dd of diaryDates) {
      const existing = await c.query("SELECT id, materials_received, work_done FROM site_diaries WHERE project_id = $1 AND date = $2", [projectId, dd.date]);
      const matEntry = {
        material: dd.mat,
        quantity: dd.qty,
        unit: 'cft',
        supplier: `Alamdar Stone Crusher (Bill #1090, ${dd.trips} Tipper${dd.trips > 1 ? 's' : ''})`
      };
      const workEntry = {
        zone: '30 MLD STP Ishbar Nishat',
        activity: dd.act,
        quantity: dd.qty,
        unit: 'cft',
        remarks: `${dd.trips} tipper load${dd.trips > 1 ? 's' : ''} laid and compacted`
      };

      if (existing.rows.length > 0) {
        const curMats = Array.isArray(existing.rows[0].materials_received) ? existing.rows[0].materials_received : [];
        const curWork = Array.isArray(existing.rows[0].work_done) ? existing.rows[0].work_done : [];
        await c.query(`
          UPDATE site_diaries
          SET 
            materials_received = $1::jsonb,
            work_done = $2::jsonb,
            updated_at = NOW()
          WHERE id = $3
        `, [
          JSON.stringify([...curMats.filter((m) => !m.supplier?.includes('1090')), matEntry]),
          JSON.stringify([...curWork.filter((w) => !w.remarks?.includes('1090')), workEntry]),
          existing.rows[0].id
        ]);
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
            'sunny', 'sunny', 14.0, 28.5, 0, false, 0,
            4, 14, 2, 20,
            '[{"type": "Vibratory Roller", "count": 1, "hours": 8, "remarks": "Sub-base compaction"}, {"type": "Motor Grader", "count": 1, "hours": 6, "remarks": "Leveling aggregate"}, {"type": "Water Tanker", "count": 1, "hours": 5, "remarks": "Moisture conditioning"}]'::jsonb,
            $3::jsonb, $4::jsonb,
            '[]'::jsonb, 'Smooth site operations in clear summer weather.',
            'Ensure optimum moisture content before rolling. Maintain 150mm compacted layer thickness.',
            'Continue sub-base laying towards eastern access road.',
            false, 'approved', NOW(), NOW()
          )
        `, [
          projectId, dd.date,
          JSON.stringify([workEntry]),
          JSON.stringify([matEntry])
        ]);
      }
    }

    await c.query('COMMIT');
    console.log('SUCCESS: Production Supabase database successfully seeded with Alamdar Stone Crusher Bill #1090 data!');
  } catch (err) {
    await c.query('ROLLBACK');
    console.error('ERROR during seeding (transaction rolled back):', err);
    throw err;
  } finally {
    await c.end();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
