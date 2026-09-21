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
  console.log('========================================================================');
  console.log('ALAMDAR BILL NO. 1101 VERIFICATION (1,28,825 CFT CTSB - ₹40,57,988.00)');
  console.log('========================================================================\n');

  // 1. Verify Expense
  console.log('--- 1. ACCOUNTING EXPENSE / VENDOR BILL ---');
  const expRes = await client.query(`
    SELECT bill_no, bill_date, gross_amount, gst_pct, gst_amount, cgst_amount, sgst_amount, net_payable, status 
    FROM expenses 
    WHERE bill_no = '1101'
  `);
  if (expRes.rows.length === 0) {
    console.log('ERROR: Expense for Bill 1101 not found!');
  } else {
    const e = expRes.rows[0];
    console.log(`  • Bill: ${e.bill_no} | Date: ${e.bill_date.toISOString().split('T')[0]} | Gross: ₹${parseFloat(e.gross_amount).toLocaleString('en-IN')} | GST: ₹${parseFloat(e.gst_amount).toLocaleString('en-IN')} (CGST ₹${parseFloat(e.cgst_amount).toLocaleString('en-IN')} + SGST ₹${parseFloat(e.sgst_amount).toLocaleString('en-IN')}) | Net Payable: ₹${parseFloat(e.net_payable).toLocaleString('en-IN')} | Status: ${e.status}`);
  }

  // 2. Verify Purchase Order
  console.log('\n--- 2. PURCHASE ORDER & ITEMS ---');
  const poRes = await client.query(`
    SELECT po_number, taxable_amount, total_tax, grand_total, status 
    FROM purchase_orders 
    WHERE po_number = 'PO-KIPL-2026-0011'
  `);
  if (poRes.rows.length > 0) {
    const p = poRes.rows[0];
    console.log(`  • PO: ${p.po_number} | Taxable: ₹${parseFloat(p.taxable_amount).toLocaleString('en-IN')} | Tax: ₹${parseFloat(p.total_tax).toLocaleString('en-IN')} | Grand Total: ₹${parseFloat(p.grand_total).toLocaleString('en-IN')} | Status: ${p.status}`);
  }
  const poiRes = await client.query(`
    SELECT poi.item_description, poi.quantity, poi.unit, poi.unit_rate, poi.gst_rate, poi.total_amount 
    FROM purchase_order_items poi
    JOIN purchase_orders po ON po.id = poi.purchase_order_id
    WHERE po.po_number = 'PO-KIPL-2026-0011'
  `);
  for (const pi of poiRes.rows) {
    console.log(`  • Item: ${pi.item_description} | ${parseFloat(pi.quantity).toLocaleString('en-IN')} ${pi.unit} @ ₹${parseFloat(pi.unit_rate)} | GST ${parseFloat(pi.gst_rate)}% | Total: ₹${parseFloat(pi.total_amount).toLocaleString('en-IN')}`);
  }

  // 3. Verify GRN
  console.log('\n--- 3. GOODS RECEIPT NOTE ---');
  const grnRes = await client.query(`
    SELECT grn_number, invoice_number, received_date, received_by_name 
    FROM goods_receipt_notes 
    WHERE grn_number = 'GRN-2026-0011'
  `);
  if (grnRes.rows.length > 0) {
    const g = grnRes.rows[0];
    console.log(`  • GRN: ${g.grn_number} | Invoice: ${g.invoice_number} | Date: ${g.received_date.toISOString().split('T')[0]} | Received By: ${g.received_by_name}`);
  }

  // 4. Verify Payment Requisition
  console.log('\n--- 4. PAYMENT REQUISITION ---');
  const prRes = await client.query(`
    SELECT pr_number, total_order_cost, total_amount_to_pay, procurement_status, accounts_status, status 
    FROM payment_requisitions 
    WHERE pr_number = 'PR-2026-0010'
  `);
  if (prRes.rows.length > 0) {
    const pr = prRes.rows[0];
    console.log(`  • PR: ${pr.pr_number} | Total Cost: ₹${parseFloat(pr.total_order_cost).toLocaleString('en-IN')} | Payable: ₹${parseFloat(pr.total_amount_to_pay).toLocaleString('en-IN')} | Proc Status: ${pr.procurement_status} | Accounts Status: ${pr.accounts_status} | Final: ${pr.status}`);
  }

  // 5. Verify Material Register
  console.log('\n--- 5. MATERIAL REGISTER DELIVERIES ---');
  const mrRes = await client.query(`
    SELECT COUNT(*) as line_count, SUM(received_qty) as total_qty, SUM(amount) as total_base_amount
    FROM material_register 
    WHERE invoice_no = '1101'
  `);
  const mr = mrRes.rows[0];
  console.log(`  • Invoice 1101 Lines: ${mr.line_count} (Target: 227) | Total Qty: ${parseFloat(mr.total_qty).toLocaleString('en-IN')} cft (Target: 1,28,825 cft) | Taxable Value: ₹${parseFloat(mr.total_base_amount).toLocaleString('en-IN')} (Target: ₹38,64,750.00)`);

  // 6. Verify Site Diaries across all 17 dates
  console.log('\n--- 6. SITE DIARIES ACROSS ALL 17 DATES ---');
  const dates = [
    '2026-08-13', '2026-08-16', '2026-08-17', '2026-08-18', '2026-08-19',
    '2026-08-20', '2026-08-21', '2026-08-22', '2026-08-23', '2026-08-24',
    '2026-08-25', '2026-08-26', '2026-08-27', '2026-08-28', '2026-08-29',
    '2026-08-30', '2026-08-31'
  ];
  const sdRes = await client.query(`
    SELECT date, weather_morning, labour_total, jsonb_array_length(materials_received) as mats_count, jsonb_array_length(work_done) as work_count, status
    FROM site_diaries 
    WHERE date = ANY($1::date[])
    ORDER BY date ASC
  `, [dates]);

  console.log(`  Found ${sdRes.rows.length} of ${dates.length} site diaries:`);
  for (const sd of sdRes.rows) {
    console.log(`  • ${sd.date.toISOString().split('T')[0]} | Weather: ${sd.weather_morning.padEnd(6)} | Labour: ${sd.labour_total} | Mats Logged: ${sd.mats_count} | Works Logged: ${sd.work_count} | Status: ${sd.status}`);
  }

  console.log('\n========================================================================');
  const allMatched = (
    parseFloat(expRes.rows[0]?.net_payable) === 4057988 &&
    parseFloat(poRes.rows[0]?.grand_total) === 4057988 &&
    parseFloat(prRes.rows[0]?.total_amount_to_pay) === 4057988 &&
    parseInt(mr.line_count, 10) === 227 &&
    parseFloat(mr.total_qty) === 128825 &&
    sdRes.rows.length === 17
  );

  if (allMatched) {
    console.log('ALL VERIFICATIONS PASSED PERFECTLY (BILL NO. 1101 ₹40,57,988.00 FOR 1,28,825 CFT 100% MATCHED)!');
  } else {
    console.log('WARNING: Some values did not match!');
  }
  console.log('========================================================================\n');

  await client.end();
}

main().catch(console.error);
