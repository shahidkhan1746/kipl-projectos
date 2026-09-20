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
  console.log('Connected to Supabase production.');
  await c.query('BEGIN');

  try {
    const projectId = '4a5176c7-0f53-42cc-bbd8-1a7259648a96';
    const sapconVendorId = '7d2b56f0-7228-4b88-880d-96623cdafae7';
    const waniVendorId = '6833fc87-6733-486d-96b1-fd7c90e2b97d';

    // 1. Update Vendors Master Details
    console.log('1. Updating Vendor details...');
    await c.query(`
      UPDATE vendors
      SET 
        trade_name = 'Sapcon Steels',
        gstin = '01AADCS4799Q1ZO',
        pan = 'AADCS4799Q',
        address = '6 Akhnoor Road Jammu - 180016, J&K',
        phone = COALESCE(phone, '0191-2505212'),
        bank_account = '{"bank": "Jammu and Kashmir Bank 212", "branch": "PATEL NAGAR JAMMU", "ifsc": "JAKA0PATTEL", "accountNo": "0246020100000212"}'::jsonb,
        updated_at = NOW()
      WHERE id = $1
    `, [sapconVendorId]);

    await c.query(`
      UPDATE vendors
      SET 
        trade_name = 'WC Estimate',
        phone = '9622633263',
        email = 'wanishafi828@gmail.com',
        address = 'Main Market Awantipora, Pulwama, Jammu & Kashmir - 192122',
        bank_account = '{"bank": "J&K Bank", "branch": "Awantipora", "ifsc": "JAKA0AWANTI", "accountNo": "0334020100000730"}'::jsonb,
        updated_at = NOW()
      WHERE id = $1
    `, [waniVendorId]);

    // 2. Purchase Orders & Items
    console.log('2. Updating / Seeding Purchase Orders...');
    // Sapcon PO: Update order_date and grand_total
    const sapconPoId = '48a34f85-a654-415f-bafd-8bb32a65b1d4';
    await c.query(`
      UPDATE purchase_orders
      SET 
        order_date = '2026-09-11',
        expected_delivery_date = '2026-09-15',
        grand_total = 2254166.00,
        subtotal_amount = 1910310.00,
        tax_amount = 343855.80,
        cgst_amount = 171927.90,
        sgst_amount = 171927.90,
        other_charges = 0.20,
        updated_at = NOW()
      WHERE id = $1
    `, [sapconPoId]);

    // Insert Sapcon PO items into relational table
    const sapconPoItem1 = 'a1a14f85-a654-415f-bafd-8bb32a65b101';
    const sapconPoItem2 = 'a1a14f85-a654-415f-bafd-8bb32a65b102';

    await c.query(`
      INSERT INTO purchase_order_items (
        id, purchase_order_id, item_description, hsn_code, quantity, unit,
        unit_rate, discount_percent, gst_rate, taxable_amount, gst_amount, total_amount, received_qty,
        created_at, updated_at
      ) VALUES
      ($1, $2, 'TMT BAR 8mm (SAIL)', '72142090', 8015.000, 'kg', 65.75, 0.00, 18.00, 526986.25, 94857.53, 621843.78, 8015.000, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        quantity = EXCLUDED.quantity,
        unit_rate = EXCLUDED.unit_rate,
        total_amount = EXCLUDED.total_amount,
        received_qty = EXCLUDED.received_qty,
        updated_at = NOW()
    `, [sapconPoItem1, sapconPoId]);

    await c.query(`
      INSERT INTO purchase_order_items (
        id, purchase_order_id, item_description, hsn_code, quantity, unit,
        unit_rate, discount_percent, gst_rate, taxable_amount, gst_amount, total_amount, received_qty,
        created_at, updated_at
      ) VALUES
      ($1, $2, 'TMT BAR 16mm (SAIL)', '72142090', 22045.000, 'kg', 62.75, 0.00, 18.00, 1383323.75, 248998.28, 1632322.03, 22045.000, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        quantity = EXCLUDED.quantity,
        unit_rate = EXCLUDED.unit_rate,
        total_amount = EXCLUDED.total_amount,
        received_qty = EXCLUDED.received_qty,
        updated_at = NOW()
    `, [sapconPoItem2, sapconPoId]);

    // Wani PO: Create PO-KIPL-2026-0006
    const waniPoId = 'b2b4da40-570e-4b11-9e23-786000001880';
    const waniPoItemsJson = [
      {
        item_description: 'TMT SAIL BARS 8MM',
        quantity: 5130,
        unit: 'KG',
        unit_rate: 73.40,
        taxable_amount: 376522.00,
        total_amount: 376522.00
      },
      {
        item_description: 'TMT SAIL BARS 16MM',
        quantity: 12975,
        unit: 'KG',
        unit_rate: 70.00,
        taxable_amount: 908227.00,
        total_amount: 908227.00
      }
    ];

    await c.query(`
      INSERT INTO purchase_orders (
        id, project_id, po_number, po_date, order_date, expected_delivery_date,
        vendor_id, vendor_name, vendor_phone, vendor_email, vendor_address,
        subject, category, work_component, delivery_location, billing_address, shipping_address,
        payment_terms, delivery_terms, items,
        taxable_amount, cgst_amount, sgst_amount, igst_amount, total_tax,
        subtotal_amount, tax_amount, freight_charges, other_charges, grand_total, total_amount,
        status, created_by, approved_by, issued_by_name, approved_by_name, remarks, notes,
        created_at, updated_at
      ) VALUES (
        $1, $2, 'PO-KIPL-2026-0006', '2026-08-08', '2026-08-08', '2026-08-12',
        $3, 'Wani Cement & Iron Store', '9622633263', 'wanishafi828@gmail.com', 'Main Market Awantipora, Pulwama',
        'Supply of TMT SAIL Bars 8mm & 16mm for Shalimar SPS Civil Structural Works', 'steel_rebar', 'Pumping Station Structural Reinforcement',
        'Shalimar SPS Site, Srinagar', 'M/s Khilari Infrastructure Pvt. Ltd., 30 MLD STP Ishbar Nishat Srinagar', 'Shalimar SPS Site, Srinagar',
        'Against verified site delivery challans & bill', 'FOR Shalimar Site, Srinagar', $4::jsonb,
        1284749.00, 0.00, 0.00, 0.00, 0.00,
        1284749.00, 0.00, -50000.00, 0.00, 1234749.00, 1234749.00,
        'completed', 'Procurement Head Office', 'Project Manager',
        'Procurement Head Office', 'Project Manager',
        'Supply of 18,105 kg SAIL TMT rebar for Shalimar SPS. Subtotal ₹12,84,749 less ₹50,000 freight = ₹12,34,749 net.',
        'Supply of 18,105 kg SAIL TMT rebar for Shalimar SPS. Subtotal ₹12,84,749 less ₹50,000 freight = ₹12,34,749 net.',
        NOW(), NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        grand_total = EXCLUDED.grand_total,
        total_amount = EXCLUDED.total_amount,
        status = EXCLUDED.status,
        items = EXCLUDED.items,
        updated_at = NOW()
    `, [waniPoId, projectId, waniVendorId, JSON.stringify(waniPoItemsJson)]);

    const waniPoItem1 = 'c3c4da40-570e-4b11-9e23-786000001881';
    const waniPoItem2 = 'c3c4da40-570e-4b11-9e23-786000001882';

    await c.query(`
      INSERT INTO purchase_order_items (
        id, purchase_order_id, item_description, hsn_code, quantity, unit,
        unit_rate, discount_percent, gst_rate, taxable_amount, gst_amount, total_amount, received_qty,
        created_at, updated_at
      ) VALUES
      ($1, $2, 'TMT SAIL BARS 8MM', '72142090', 5130.000, 'KG', 73.40, 0.00, 0.00, 376522.00, 0.00, 376522.00, 5130.000, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        quantity = EXCLUDED.quantity,
        unit_rate = EXCLUDED.unit_rate,
        total_amount = EXCLUDED.total_amount,
        received_qty = EXCLUDED.received_qty,
        updated_at = NOW()
    `, [waniPoItem1, waniPoId]);

    await c.query(`
      INSERT INTO purchase_order_items (
        id, purchase_order_id, item_description, hsn_code, quantity, unit,
        unit_rate, discount_percent, gst_rate, taxable_amount, gst_amount, total_amount, received_qty,
        created_at, updated_at
      ) VALUES
      ($1, $2, 'TMT SAIL BARS 16MM', '72142090', 12975.000, 'KG', 70.00, 0.00, 0.00, 908227.00, 0.00, 908227.00, 12975.000, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        quantity = EXCLUDED.quantity,
        unit_rate = EXCLUDED.unit_rate,
        total_amount = EXCLUDED.total_amount,
        received_qty = EXCLUDED.received_qty,
        updated_at = NOW()
    `, [waniPoItem2, waniPoId]);

    // 3. Goods Receipt Notes (GRN-2026-0005 for Sapcon & GRN-2026-0006 for Wani)
    console.log('3. Seeding Goods Receipt Notes...');
    const sapconGrnId = 'd4d4da40-570e-4b11-9e23-786000000904';
    const waniGrnId = 'd4d4da40-570e-4b11-9e23-786000001880';

    await c.query(`
      INSERT INTO goods_receipt_notes (
        id, project_id, grn_number, purchase_order_id, received_date,
        challan_number, invoice_number, vehicle_number, received_by_name, remarks,
        write_to_material_register, created_at, updated_at
      ) VALUES (
        $1, $2, 'GRN-2026-0005', $3, '2026-09-15',
        'CH-SAP-904', 'GSTSI2627/904', 'JK18D3699',
        'Shahid Khan (Site Incharge)',
        'Received 30.06 MT TMT SAIL Steel Bars (8,015 kg 8mm + 22,045 kg 16mm) from Sapcon Steels Jammu via Truck JK18D3699 for 38.5 MLD STP Gupta Ganga Ishbar Nishat.',
        true, NOW(), NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        received_date = EXCLUDED.received_date,
        invoice_number = EXCLUDED.invoice_number,
        vehicle_number = EXCLUDED.vehicle_number,
        updated_at = NOW()
    `, [sapconGrnId, projectId, sapconPoId]);

    await c.query(`
      INSERT INTO goods_receipt_note_items (
        id, grn_id, purchase_order_item_id, item_description, received_qty, unit, remarks, created_at, updated_at
      ) VALUES
      (gen_random_uuid(), $1, $2, 'TMT BAR 8mm (SAIL)', 8015.000, 'kg', '8,015 kg rebar delivered via JK18D3699', NOW(), NOW()),
      (gen_random_uuid(), $1, $3, 'TMT BAR 16mm (SAIL)', 22045.000, 'kg', '22,045 kg rebar delivered via JK18D3699', NOW(), NOW())
      ON CONFLICT DO NOTHING
    `, [sapconGrnId, sapconPoItem1, sapconPoItem2]);

    await c.query(`
      INSERT INTO goods_receipt_notes (
        id, project_id, grn_number, purchase_order_id, received_date,
        challan_number, invoice_number, vehicle_number, received_by_name, remarks,
        write_to_material_register, created_at, updated_at
      ) VALUES (
        $1, $2, 'GRN-2026-0006', $3, '2026-08-12',
        'CH-WANI-1880', '1880', 'JK01AL1373',
        'Shahid Khan (Site Incharge)',
        'Received 18.105 MT TMT SAIL Steel Bars (5,130 kg 8mm + 12,975 kg 16mm) from Wani Cement & Iron Store Awantipora via Truck JK01AL1373 at Shalimar site.',
        true, NOW(), NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        received_date = EXCLUDED.received_date,
        invoice_number = EXCLUDED.invoice_number,
        vehicle_number = EXCLUDED.vehicle_number,
        updated_at = NOW()
    `, [waniGrnId, projectId, waniPoId]);

    await c.query(`
      INSERT INTO goods_receipt_note_items (
        id, grn_id, purchase_order_item_id, item_description, received_qty, unit, remarks, created_at, updated_at
      ) VALUES
      (gen_random_uuid(), $1, $2, 'TMT SAIL BARS 8MM', 5130.000, 'KG', '5,130 kg rebar delivered via JK01AL1373 to Shalimar', NOW(), NOW()),
      (gen_random_uuid(), $1, $3, 'TMT SAIL BARS 16MM', 12975.000, 'KG', '12,975 kg rebar delivered via JK01AL1373 to Shalimar', NOW(), NOW())
      ON CONFLICT DO NOTHING
    `, [waniGrnId, waniPoItem1, waniPoItem2]);

    // 4. Update Material Register (Rates, Amounts, Purposes, Challans, WBS Codes, GRN Links)
    console.log('4. Updating Material Register for Sapcon and Wani...');
    
    // Sapcon 8mm
    await c.query(`
      UPDATE material_register
      SET
        rate = 65.75,
        amount = 526986.25,
        purpose = 'Civil structural reinforcement & stirrups for 38.5 MLD STP Gupta Ganga Ishbar Nishat',
        challan_no = 'CH-SAP-904',
        wbs_code = 'WBS-STP-REBAR',
        grn_id = $1,
        site_zone = '38.5 MLD STP Ishbar Nishat',
        updated_at = NOW()
      WHERE invoice_no = 'GSTSI2627/904' AND material ILIKE '%8MM%'
    `, [sapconGrnId]);

    // Sapcon 16mm
    await c.query(`
      UPDATE material_register
      SET
        rate = 62.75,
        amount = 1383323.75,
        purpose = 'Main longitudinal structural reinforcement for 38.5 MLD STP units & foundation raft',
        challan_no = 'CH-SAP-904',
        wbs_code = 'WBS-STP-REBAR',
        grn_id = $1,
        site_zone = '38.5 MLD STP Ishbar Nishat',
        updated_at = NOW()
      WHERE invoice_no = 'GSTSI2627/904' AND material ILIKE '%16MM%'
    `, [sapconGrnId]);

    // Wani 8mm
    await c.query(`
      UPDATE material_register
      SET
        rate = 73.40,
        amount = 376522.00,
        purpose = 'Reinforcement ties & stirrups for Shalimar Sewage Pumping Station (SPS) sump & civil works',
        challan_no = 'CH-WANI-1880',
        wbs_code = 'WBS-SHAL-SPS',
        grn_id = $1,
        site_zone = 'Shalimar Site',
        updated_at = NOW()
      WHERE invoice_no = '1880' AND material ILIKE '%8MM%'
    `, [waniGrnId]);

    // Wani 16mm
    await c.query(`
      UPDATE material_register
      SET
        rate = 70.00,
        amount = 908227.00,
        purpose = 'Main rebar cage fabrication for Shalimar Sewage Pumping Station (SPS) structural walls & slab',
        challan_no = 'CH-WANI-1880',
        wbs_code = 'WBS-SHAL-SPS',
        grn_id = $1,
        site_zone = 'Shalimar Site',
        updated_at = NOW()
      WHERE invoice_no = '1880' AND material ILIKE '%16MM%'
    `, [waniGrnId]);

    // 5. Payment Requisitions
    console.log('5. Seeding Payment Requisitions for Sapcon & Wani...');
    const sapconPrId = 'e5e4da40-570e-4b11-9e23-786000000904';
    const sapconPrItemId = 'f6f4da40-570e-4b11-9e23-786000000904';

    await c.query(`
      INSERT INTO payment_requisitions (
        id, project_id, pr_number, title, pr_date, site_location, requested_by_name,
        status, total_order_cost, total_advance_paid, total_amount_to_pay, total_balance,
        procurement_status, procurement_approved_by_name, procurement_approved_at, procurement_remarks,
        accounts_status, accounts_approved_by_name, accounts_approved_at, accounts_remarks,
        notes, created_at, updated_at
      ) VALUES (
        $1, $2, 'PR-2026-0004',
        'Payment Requisition for TMT Steel Rebar (30.06 MT) — Sapcon Steels (Invoice #GSTSI2627/904)',
        '2026-09-15', '38.5 MLD STP Gupta Ganga Ishbar Nishat', 'Shahid Khan (Site Incharge)',
        'approved', 2254166.00, 0.00, 2254166.00, 0.00,
        'approved', 'Project Manager', '2026-09-16 11:00:00+00',
        'Quantity 30,060 kg verified against weighbridge slip and delivery truck JK18D3699. Recommended for payment.',
        'approved', 'Accountant', '2026-09-16 15:30:00+00',
        'Tax Invoice GSTSI2627/904 verified. Taxable ₹19,10,310 + CGST 9% (₹1,71,927.90) + UTGST 9% (₹1,71,927.90) + 0.20 round off = ₹22,54,166.00. Bank: J&K Bank Patel Nagar Jammu A/C 0246020100000212, IFSC JAKA0PATTEL. RTGS released.',
        'Payment against Sapcon Steels Pvt Ltd Invoice GSTSI2627/904 dated 15-Sep-2026 under PO #376.',
        NOW(), NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        total_amount_to_pay = EXCLUDED.total_amount_to_pay,
        status = EXCLUDED.status,
        updated_at = NOW()
    `, [sapconPrId, projectId]);

    await c.query(`
      INSERT INTO payment_requisition_items (
        id, payment_requisition_id, sr_no, vendor_id, vendor_name, description,
        material_or_services, is_msme, total_order_cost, advance_paid, amount_to_pay,
        balance_amount, site_location, remark, against_ref, mode_of_payment, created_at, updated_at
      ) VALUES (
        $1, $2, 1, $3, 'Sapcon Steels Private Limited',
        'Supply of 30,060 kg TMT SAIL Bar (8,015 kg @ 65.75 & 22,045 kg @ 62.75) for 38.5 MLD STP Nishat',
        'Material', false, 2254166.00, 0.00, 2254166.00, 0.00,
        '38.5 MLD STP Gupta Ganga Ishbar Nishat', 'Against Tax Invoice GSTSI2627/904 dt. 15/09/2026',
        'Invoice GSTSI2627/904 (GRN-2026-0005)', 'RTGS', NOW(), NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        amount_to_pay = EXCLUDED.amount_to_pay,
        balance_amount = EXCLUDED.balance_amount,
        updated_at = NOW()
    `, [sapconPrItemId, sapconPrId, sapconVendorId]);

    const waniPrId = 'e5e4da40-570e-4b11-9e23-786000001880';
    const waniPrItemId = 'f6f4da40-570e-4b11-9e23-786000001880';

    await c.query(`
      INSERT INTO payment_requisitions (
        id, project_id, pr_number, title, pr_date, site_location, requested_by_name,
        status, total_order_cost, total_advance_paid, total_amount_to_pay, total_balance,
        procurement_status, procurement_approved_by_name, procurement_approved_at, procurement_remarks,
        accounts_status, accounts_approved_by_name, accounts_approved_at, accounts_remarks,
        notes, created_at, updated_at
      ) VALUES (
        $1, $2, 'PR-2026-0005',
        'Payment Requisition for TMT SAIL Rebar (18.105 MT) — Wani Cement & Iron Store (Bill #1880)',
        '2026-08-12', 'Shalimar SPS Site', 'Shahid Khan (Site Incharge)',
        'approved', 1234749.00, 0.00, 1234749.00, 0.00,
        'approved', 'Project Manager', '2026-08-13 10:00:00+00',
        'Quantity 18,105 kg verified at Shalimar site via Truck JK01AL1373. Recommended for payment.',
        'approved', 'Accountant', '2026-08-13 14:00:00+00',
        'Bill #1880 verified. Subtotal ₹12,84,749 less (-)₹50,000 freight deduction = ₹12,34,749.00 net payable. Bank: J&K Bank Awantipora A/C 0334020100000730, IFSC JAKA0AWANTI. Passed for RTGS.',
        'Payment against Wani Cement & Iron Store (WC Estimate) Bill #1880 dated 12-Aug-2026.',
        NOW(), NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        total_amount_to_pay = EXCLUDED.total_amount_to_pay,
        status = EXCLUDED.status,
        updated_at = NOW()
    `, [waniPrId, projectId]);

    await c.query(`
      INSERT INTO payment_requisition_items (
        id, payment_requisition_id, sr_no, vendor_id, vendor_name, description,
        material_or_services, is_msme, total_order_cost, advance_paid, amount_to_pay,
        balance_amount, site_location, remark, against_ref, mode_of_payment, created_at, updated_at
      ) VALUES (
        $1, $2, 1, $3, 'Wani Cement & Iron Store',
        'Supply of 18,105 kg TMT SAIL Bars (5,130 kg 8mm @ 73.40 & 12,975 kg 16mm @ 70.00) less (-)₹50,000 freight',
        'Material', true, 1234749.00, 0.00, 1234749.00, 0.00,
        'Shalimar Site', 'Against Invoice #1880 dt. 12/08/2026',
        'Invoice #1880 (GRN-2026-0006)', 'RTGS', NOW(), NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        amount_to_pay = EXCLUDED.amount_to_pay,
        balance_amount = EXCLUDED.balance_amount,
        updated_at = NOW()
    `, [waniPrItemId, waniPrId, waniVendorId]);

    // 6. Site Diaries for 12/08/2026 and 15/09/2026
    console.log('6. Updating Site Diaries...');
    
    // 2026-08-12 (Wani)
    const existingWaniDiary = await c.query("SELECT id, materials_received, work_done FROM site_diaries WHERE project_id = $1 AND date = '2026-08-12'", [projectId]);
    const waniMatEntry = {
      material: 'TMT SAIL Bars (8mm & 16mm)',
      quantity: 18105,
      unit: 'KG',
      supplier: 'Wani Cement & Iron Store (Bill #1880, Truck JK01AL1373)'
    };
    const waniWorkEntry = {
      zone: 'Shalimar Site (SPS)',
      activity: 'Rebar cutting, bending and rebar cage tying for SPS foundation sump',
      quantity: 18.1,
      unit: 'MT',
      remarks: 'Delivered by JK01AL1373 from Awantipora: 5,130 kg 8mm + 12,975 kg 16mm'
    };

    if (existingWaniDiary.rows.length > 0) {
      const curMats = Array.isArray(existingWaniDiary.rows[0].materials_received) ? existingWaniDiary.rows[0].materials_received : [];
      const curWork = Array.isArray(existingWaniDiary.rows[0].work_done) ? existingWaniDiary.rows[0].work_done : [];
      await c.query(`
        UPDATE site_diaries
        SET 
          materials_received = $1::jsonb,
          work_done = $2::jsonb,
          updated_at = NOW()
        WHERE id = $3
      `, [
        JSON.stringify([...curMats.filter((m) => !m.supplier?.includes('1880')), waniMatEntry]),
        JSON.stringify([...curWork.filter((w) => !w.remarks?.includes('1880')), waniWorkEntry]),
        existingWaniDiary.rows[0].id
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
          gen_random_uuid(), $1, '2026-08-12', 'Shahid Khan (Site Incharge)',
          'sunny', 'sunny', 18.0, 31.0, 0, false, 0,
          6, 12, 2, 20,
          '[{"type": "Bar Bending Machine", "count": 1, "hours": 8, "remarks": "Rebar fabrication"}, {"type": "Bar Cutting Machine", "count": 1, "hours": 8, "remarks": "Cutting 16mm/8mm"}]'::jsonb,
          $2::jsonb, $3::jsonb,
          '[]'::jsonb, 'None. Materials unloaded safely at Shalimar SPS yard.',
          'Verify bar spacing and lap lengths as per approved structural drawings.',
          'Continue rebar binding for pump sump bottom raft.',
          false, 'approved', NOW(), NOW()
        )
      `, [projectId, JSON.stringify([waniWorkEntry]), JSON.stringify([waniMatEntry])]);
    }

    // 2026-09-15 (Sapcon)
    const existingSapconDiary = await c.query("SELECT id, materials_received, work_done FROM site_diaries WHERE project_id = $1 AND date = '2026-09-15'", [projectId]);
    const sapconMatEntry = {
      material: 'TMT SAIL Rebar (8mm & 16mm)',
      quantity: 30060,
      unit: 'KG',
      supplier: 'Sapcon Steels Private Limited (Invoice #GSTSI2627/904, Truck JK18D3699)'
    };
    const sapconWorkEntry = {
      zone: '38.5 MLD STP Gupta Ganga Ishbar Nishat',
      activity: 'Rebar unloading, quality inspection, bar bending & binding for SBR / C-Tech basins',
      quantity: 30.06,
      unit: 'MT',
      remarks: 'Delivered by JK18D3699 from Jammu: 8,015 kg 8mm + 22,045 kg 16mm'
    };

    if (existingSapconDiary.rows.length > 0) {
      const curMats = Array.isArray(existingSapconDiary.rows[0].materials_received) ? existingSapconDiary.rows[0].materials_received : [];
      const curWork = Array.isArray(existingSapconDiary.rows[0].work_done) ? existingSapconDiary.rows[0].work_done : [];
      await c.query(`
        UPDATE site_diaries
        SET 
          materials_received = $1::jsonb,
          work_done = $2::jsonb,
          updated_at = NOW()
        WHERE id = $3
      `, [
        JSON.stringify([...curMats.filter((m) => !m.supplier?.includes('904')), sapconMatEntry]),
        JSON.stringify([...curWork.filter((w) => !w.remarks?.includes('904')), sapconWorkEntry]),
        existingSapconDiary.rows[0].id
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
          gen_random_uuid(), $1, '2026-09-15', 'Shahid Khan (Site Incharge)',
          'sunny', 'sunny', 14.5, 27.0, 0, false, 0,
          8, 16, 2, 26,
          '[{"type": "Hydra Crane 14T", "count": 1, "hours": 4, "remarks": "Unloading steel rebar bundles"}, {"type": "Bar Bending Machine", "count": 2, "hours": 8, "remarks": "Rebar fabrication"}]'::jsonb,
          $2::jsonb, $3::jsonb,
          '[]'::jsonb, 'None. Clear road transit from Jammu to Nishat.',
          'Take test samples for tensile strength and bend test before mass placement.',
          'Complete reinforcement fabrication for STP aeration basin walls.',
          false, 'approved', NOW(), NOW()
        )
      `, [projectId, JSON.stringify([sapconWorkEntry]), JSON.stringify([sapconMatEntry])]);
    }

    await c.query('COMMIT');
    console.log('SUCCESS: All missing rates, amounts, PO items, GRNs, PRs, and Site Diaries for Sapcon and Wani have been seeded and committed!');
  } catch (err) {
    await c.query('ROLLBACK');
    console.error('ERROR during update (rolled back):', err);
    throw err;
  } finally {
    await c.end();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
