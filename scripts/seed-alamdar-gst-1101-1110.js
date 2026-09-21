/**
 * Seeds Alamdar Stone Crusher Official GST Invoices #1101 to #1110 & Ledger Account Reconciliation:
 * - 10 GST Invoices: Bills #1101, #1102, #1103, #1104, #1105, #1106, #1107, #1108, #1109, #1110
 * - Total Quantity: 5,361 MT Bajari (HSN 251710) @ ₹750/MT
 * - Taxable Subtotal: ₹40,20,750.00
 * - UTGST (2.5%): ₹1,00,518.75
 * - CGST (2.5%): ₹1,00,518.75
 * - Round Off: +₹2.50
 * - Total Billed: ₹42,21,790.00
 * - Statement of Account Opening Balance (23/08/2026): ₹27,600.00 Dr
 * - Closing Ledger Balance (31/08/2026): ₹4,249,390.00 Dr (Exact Match)
 * - Modules Populated:
 *     - 10 Expenses (Approved, RTGS details)
 *     - Master Purchase Order PO-KIPL-2026-0012 with 10 items (Completed)
 *     - Goods Receipt Note GRN-2026-0012
 *     - Payment Requisition PR-2026-0011 with 10 items (Dual-Approved)
 *     - Site Diaries (Aug 29, 30, 31 updated with Bajari receipts)
 *     - Material Register (Linked to official invoice range 1101-1110)
 */

let pg;
try {
  pg = require('pg');
} catch (e) {
  pg = require('../backend/node_modules/pg');
}
const fs = require('fs');
const path = require('path');
const { Client } = pg;

const invoices = JSON.parse(fs.readFileSync(path.join(__dirname, 'data-alamdar-gst-1101-1110.json'), 'utf8'));

const client = new Client({
  host: process.env.SUPABASE_HOST || 'aws-0-ap-northeast-1.pooler.supabase.com',
  port: parseInt(process.env.SUPABASE_PORT || '5432', 10),
  database: process.env.SUPABASE_DB || 'postgres',
  user: process.env.SUPABASE_USER || 'postgres.pfgivrzqsgbxiuhloinu',
  password: process.env.SUPABASE_PASSWORD || 'Vpcea46fg@1746',
  ssl: { rejectUnauthorized: false },
});

async function main() {
  await client.connect();
  console.log('Connected to Supabase PostgreSQL database.');

  try {
    await client.query('BEGIN');

    const projectId = '4a5176c7-0f53-42cc-bbd8-1a7259648a96';
    const vendorId = 'b99e1d96-575d-4213-8d7d-a4be9808e355';

    // 0. Setting up CTSB internal measurement bill in expenses with distinct ID
    console.log('0. Setting up CTSB internal measurement bill in expenses...');
    await client.query("DELETE FROM expenses WHERE id::text LIKE '1111da40-570e-4b11-9e23-7860000011%'");

    const ctsbExpId = 'c75b0000-570e-4b11-9e23-786000001101';
    await client.query(`
      INSERT INTO expenses (
        id, project_id, vendor_id, date, description, category,
        bill_no, bill_date, gross_amount, gst_pct, gst_amount, cgst_amount, sgst_amount, igst_amount,
        gst_type, itc_claimed, tds_pct, tds_amount, net_payable, paid_amount, payment_mode,
        status, approved_by, remarks, created_at, updated_at
      ) VALUES (
        $1, $2, $3, '2026-08-31',
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
        updated_at = NOW()
    `, [ctsbExpId, projectId, vendorId]);

    await client.query(`
      UPDATE material_register
      SET invoice_no = '1101-CTSB / 1101-1110', updated_at = NOW()
      WHERE invoice_no = '1101' OR invoice_no = '1101-CTSB'
    `);

    // 1. Seed 10 Official GST Invoices
    console.log('1. Upserting 10 Official GST Invoices into expenses...');
    let totalTaxable = 0;
    let totalGst = 0;
    let totalNet = 0;

    for (const inv of invoices) {
      const expId = `a1a3da40-570e-4b11-9e23-78600000${inv.bill_no}`;
      totalTaxable += inv.taxable_amount;
      totalGst += inv.total_gst;
      totalNet += inv.bill_total;

      await client.query(`
        INSERT INTO expenses (
          id, project_id, vendor_id, date, description, category,
          bill_no, bill_date, gross_amount, gst_pct, gst_amount, cgst_amount, sgst_amount, igst_amount,
          gst_type, itc_claimed, tds_pct, tds_amount, net_payable, paid_amount, payment_mode,
          status, approved_by, remarks, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4,
          $5, 'material',
          $6, $4,
          $7, $8, $9, $10, $11, 0.00,
          'intrastate', true, 0.00, 0.00, $12, 0.00, 'RTGS',
          'approved', 'Accountant',
          $13,
          NOW(), NOW()
        )
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
          updated_at = NOW()
      `, [
        expId, projectId, vendorId, inv.date,
        `Alamdar Stone Crusher GST Invoice #${inv.bill_no} (${inv.qty_mt} MT Bajari @ ₹750/MT + 5% GST)`,
        inv.bill_no,
        inv.taxable_amount, inv.gst_rate, inv.total_gst, inv.cgst_amount, inv.utgst_amount,
        inv.bill_total,
        `GST Invoice #${inv.bill_no} dt ${inv.date}. ${inv.qty_mt} MT Bajari (HSN 251710) @ ₹750/MT + 5% GST. Part of Statement of Account (Aug 23 - Aug 31, 2026) Opening Dr ₹27,600.00, Closing Dr ₹4,249,390.00. RTGS to J&K Bank Khonmoh A/C 0244020100000164, IFSC JAKA0KHONMOH.`
      ]);
    }
    console.log(`  Seeded 10 expenses. Taxable: ₹${totalTaxable.toLocaleString('en-IN')}, GST: ₹${totalGst.toLocaleString('en-IN')}, Net: ₹${totalNet.toLocaleString('en-IN')}`);

    // 2. Master Purchase Order: PO-KIPL-2026-0012
    console.log('2. Upserting Purchase Order PO-KIPL-2026-0012...');
    const po12Id = '1212da40-570e-4b11-9e23-786000000012';
    const poItemsJson = invoices.map(inv => ({
      item_description: `Bajari (HSN 251710) - Bill #${inv.bill_no} dt ${inv.date}`,
      quantity: inv.qty_mt,
      unit: 'MT',
      unit_rate: 750.00,
      gst_rate: 5.00,
      taxable_amount: inv.taxable_amount,
      gst_amount: inv.total_gst,
      total_amount: inv.bill_total,
      bill_ref: inv.bill_no
    }));

    await client.query(`
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
        $1, $2, 'PO-KIPL-2026-0012', '2026-08-28', '2026-08-28', '2026-08-31',
        $3, 'Alamdar Stone Crusher', '9797844511', 'allamdarstonecrusher786@gmail.com', '01ABMFA5025A1Z9', 'Wuyan Pampore-191102 Kashmir',
        'Supply of Bajari (5,361 MT) — Alamdar Stone Crusher (GST Invoices #1101 to #1110)',
        'aggregate_sand', 'Road Network & STP Site Development',
        '30 MLD STP Site, Gupt Ganga Ishbar Nishat, Srinagar',
        'M/s Khilari Infrastructure Pvt. Ltd., 30 MLD STP Ishbar Nishat Srinagar',
        '30 MLD STP Site, Gupt Ganga Ishbar Nishat, Srinagar',
        'Against verified GST Invoices & Ledger Statement', 'FOR Nishat STP Site',
        '${JSON.stringify(poItemsJson).replace(/'/g, "''")}'::jsonb,
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
        updated_at = NOW()
    `, [po12Id, projectId, vendorId]);

    await client.query('DELETE FROM purchase_order_items WHERE purchase_order_id = $1', [po12Id]);
    for (const inv of invoices) {
      await client.query(`
        INSERT INTO purchase_order_items (
          id, purchase_order_id, item_description, hsn_code, quantity, unit,
          unit_rate, discount_percent, gst_rate, taxable_amount, gst_amount, total_amount, received_qty,
          created_at, updated_at
        ) VALUES (
          gen_random_uuid(), $1, $2, '251710',
          $3, 'MT', 750.00, 0.00, 5.00, $4, $5, $6, $3,
          NOW(), NOW()
        )
      `, [
        po12Id,
        `Bajari (HSN 251710) - Bill #${inv.bill_no} dt ${inv.date}`,
        inv.qty_mt,
        inv.taxable_amount,
        inv.total_gst,
        inv.bill_total
      ]);
    }
    console.log('  PO & 10 Items created.');

    // 3. Goods Receipt Note: GRN-2026-0012
    console.log('3. Upserting GRN-2026-0012...');
    const grn12Id = '1313da40-570e-4b11-9e23-786000000012';
    await client.query(`
      INSERT INTO goods_receipt_notes (
        id, project_id, grn_number, purchase_order_id, received_date,
        challan_number, invoice_number, vehicle_number, received_by_name, remarks,
        write_to_material_register, created_at, updated_at
      ) VALUES (
        $1, $2, 'GRN-2026-0012', $3, '2026-08-31',
        'CH-ALM-1101-1110', '1101 to 1110',
        'Multiple Tippers (Site Weighment Batch)',
        'Shahid Khan (Site Incharge)',
        'Received 5,361 MT Bajari across 10 official GST Invoices (Bills #1101 through #1110) from Alamdar Stone Crusher at Nishat STP site.',
        true, NOW(), NOW()
      )
      ON CONFLICT (id) DO UPDATE SET updated_at = NOW()
    `, [grn12Id, projectId, po12Id]);
    console.log('  GRN created.');

    // 4. Payment Requisition: PR-2026-0011
    console.log('4. Upserting Payment Requisition PR-2026-0011...');
    const pr11Id = '1414da40-570e-4b11-9e23-786000000011';
    await client.query(`
      INSERT INTO payment_requisitions (
        id, project_id, pr_number, title, pr_date, site_location, requested_by_name,
        status, total_order_cost, total_advance_paid, total_amount_to_pay, total_balance,
        procurement_status, procurement_approved_by_name, procurement_approved_at, procurement_remarks,
        accounts_status, accounts_approved_by_name, accounts_approved_at, accounts_remarks,
        notes, created_at, updated_at
      ) VALUES (
        $1, $2, 'PR-2026-0011',
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
        updated_at = NOW()
    `, [pr11Id, projectId]);

    await client.query('DELETE FROM payment_requisition_items WHERE payment_requisition_id = $1', [pr11Id]);
    for (let i = 0; i < invoices.length; i++) {
      const inv = invoices[i];
      await client.query(`
        INSERT INTO payment_requisition_items (
          id, payment_requisition_id, sr_no, vendor_id, vendor_name, description,
          material_or_services, is_msme, total_order_cost, advance_paid, amount_to_pay,
          balance_amount, site_location, remark, against_ref, mode_of_payment, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, 'Alamdar Stone Crusher',
          $4,
          'Material', true, $5, 0.00, $5, 0.00,
          '30 MLD STP Ishbar Nishat', $6,
          $7, 'RTGS', NOW(), NOW()
        )
      `, [
        pr11Id, i + 1, vendorId,
        `Supply of ${inv.qty_mt} MT Bajari @ ₹750/MT + 5% GST against Bill #${inv.bill_no}`,
        inv.bill_total,
        `Against GST Invoice #${inv.bill_no} dt. ${inv.date}`,
        `Bill #${inv.bill_no} (GRN-2026-0012)`
      ]);
    }
    console.log('  Payment Requisition & 10 Items created.');

    // 5. Update Site Diaries (Aug 29, 30, 31) with Bajari receipts
    console.log('5. Updating Site Diaries for Aug 29, Aug 30, and Aug 31...');
    const datesToUpdate = [
      {
        date: '2026-08-29',
        qty: 2426, // Bills 1101(208) + 1102(603) + 1103(655) + 1104(694) + 1105(266)
        bills: '1101 to 1105'
      },
      {
        date: '2026-08-30',
        qty: 1378, // Bills 1106(745) + 1107(633)
        bills: '1106 & 1107'
      },
      {
        date: '2026-08-31',
        qty: 1557, // Bills 1108(386) + 1109(428) + 1110(743)
        bills: '1108 to 1110'
      }
    ];

    for (const d of datesToUpdate) {
      const diaryRes = await client.query('SELECT materials_received FROM site_diaries WHERE project_id = $1 AND date = $2', [projectId, d.date]);
      if (diaryRes.rows.length > 0) {
        let mats = diaryRes.rows[0].materials_received || [];
        // Filter out existing Bajari for this supplier to avoid duplicate appending
        mats = mats.filter(m => !(m.material && m.material.includes('Bajari')));
        mats.push({
          material: 'Bajari (Crushed Stone Coarse Aggregate / CTSB Feed)',
          quantity: d.qty,
          unit: 'MT',
          supplier: `Alamdar Stone Crusher (GST Invoices #${d.bills})`,
          remarks: `Received ${d.qty} MT Bajari @ ₹750/MT verified at site weighbridge for internal road network pavement construction.`
        });

        await client.query(`
          UPDATE site_diaries
          SET materials_received = $1::jsonb, updated_at = NOW()
          WHERE project_id = $2 AND date = $3
        `, [JSON.stringify(mats), projectId, d.date]);
        console.log(`  Updated diary for ${d.date} with ${d.qty} MT Bajari.`);
      }
    }

    await client.query('COMMIT');
    console.log('\nSUCCESS: All 10 GST Invoices, PO, GRN, PR, and Site Diaries seeded successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error during seeding:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
