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
  console.log('ALAMDAR GST INVOICE BATCH VERIFICATION (BILLS #148, #1098, #1099, #1100)');
  console.log('========================================================================\n');

  // 1. Verify Expenses
  console.log('--- 1. ACCOUNTING EXPENSES / VENDOR BILLS ---');
  const expRes = await client.query(`
    SELECT bill_no, bill_date, gross_amount, gst_pct, gst_amount, cgst_amount, sgst_amount, net_payable, status 
    FROM expenses 
    WHERE bill_no IN ('148-KB-NISHT', '1098', '1099', '1100')
    ORDER BY bill_date ASC, bill_no ASC
  `);
  let expTotal = 0;
  for (const e of expRes.rows) {
    const net = parseFloat(e.net_payable);
    expTotal += net;
    console.log(`  • Bill: ${e.bill_no.padEnd(14)} | Date: ${e.bill_date.toISOString().split('T')[0]} | Gross: ₹${parseFloat(e.gross_amount).toLocaleString('en-IN')} | GST: ₹${parseFloat(e.gst_amount).toLocaleString('en-IN')} | Net: ₹${net.toLocaleString('en-IN')} | Status: ${e.status}`);
  }
  console.log(`  => Total Net Expenses: ₹${expTotal.toLocaleString('en-IN')} (Target: ₹9,10,088)`);

  // 2. Verify Purchase Orders
  console.log('\n--- 2. PURCHASE ORDERS ---');
  const poRes = await client.query(`
    SELECT po_number, taxable_amount, total_tax, grand_total, status 
    FROM purchase_orders 
    WHERE po_number IN ('PO-KIPL-2026-0007', 'PO-KIPL-2026-0008', 'PO-KIPL-2026-0009', 'PO-KIPL-2026-0010')
    ORDER BY po_number ASC
  `);
  let poTotal = 0;
  for (const p of poRes.rows) {
    const gt = parseFloat(p.grand_total);
    poTotal += gt;
    console.log(`  • PO: ${p.po_number} | Taxable: ₹${parseFloat(p.taxable_amount).toLocaleString('en-IN')} | Tax: ₹${parseFloat(p.total_tax).toLocaleString('en-IN')} | Grand Total: ₹${gt.toLocaleString('en-IN')} | Status: ${p.status}`);
  }
  console.log(`  => Total PO Grand Total: ₹${poTotal.toLocaleString('en-IN')} (Target: ₹9,10,088)`);

  // 3. Verify Purchase Order Items
  console.log('\n--- 3. PURCHASE ORDER ITEMS (MT / Rates) ---');
  const poiRes = await client.query(`
    SELECT poi.purchase_order_id, po.po_number, poi.item_description, poi.quantity, poi.unit, poi.unit_rate, poi.gst_rate, poi.total_amount 
    FROM purchase_order_items poi
    JOIN purchase_orders po ON po.id = poi.purchase_order_id
    WHERE po.po_number IN ('PO-KIPL-2026-0007', 'PO-KIPL-2026-0008', 'PO-KIPL-2026-0009', 'PO-KIPL-2026-0010')
    ORDER BY po.po_number ASC
  `);
  for (const pi of poiRes.rows) {
    console.log(`  • ${pi.po_number}: ${pi.item_description} | ${parseFloat(pi.quantity)} ${pi.unit} @ ₹${parseFloat(pi.unit_rate)} | GST ${parseFloat(pi.gst_rate)}% | Total: ₹${parseFloat(pi.total_amount).toLocaleString('en-IN')}`);
  }

  // 4. Verify Payment Requisitions
  console.log('\n--- 4. PAYMENT REQUISITIONS ---');
  const prRes = await client.query(`
    SELECT pr_number, total_order_cost, total_amount_to_pay, status 
    FROM payment_requisitions 
    WHERE pr_number IN ('PR-2026-0006', 'PR-2026-0007', 'PR-2026-0008', 'PR-2026-0009')
    ORDER BY pr_number ASC
  `);
  let prTotal = 0;
  for (const pr of prRes.rows) {
    const amt = parseFloat(pr.total_amount_to_pay);
    prTotal += amt;
    console.log(`  • PR: ${pr.pr_number} | Cost: ₹${parseFloat(pr.total_order_cost).toLocaleString('en-IN')} | Pay: ₹${amt.toLocaleString('en-IN')} | Status: ${pr.status}`);
  }
  console.log(`  => Total PR Payable: ₹${prTotal.toLocaleString('en-IN')} (Target: ₹9,10,088)`);

  // 5. Verify Material Register Trips
  console.log('\n--- 5. MATERIAL REGISTER DELIVERIES ---');
  const mrRes = await client.query(`
    SELECT invoice_no, COUNT(*) as trip_count, SUM(received_qty) as total_qty, SUM(amount) as total_base_amount
    FROM material_register 
    WHERE invoice_no IN ('148-KB-NISHT', '1098 / 149', '1099 / 150', '1100 / 151')
    GROUP BY invoice_no
    ORDER BY invoice_no ASC
  `);
  let totalTrips = 0;
  let totalCft = 0;
  for (const mr of mrRes.rows) {
    totalTrips += parseInt(mr.trip_count, 10);
    totalCft += parseFloat(mr.total_qty);
    console.log(`  • Invoice: ${mr.invoice_no.padEnd(14)} | Trips: ${mr.trip_count.toString().padEnd(2)} | Qty: ${parseFloat(mr.total_qty).toLocaleString('en-IN')} cft | Base Amount: ₹${parseFloat(mr.total_base_amount).toLocaleString('en-IN')}`);
  }
  console.log(`  => Total Trips: ${totalTrips} (Target: 79) | Total Qty: ${totalCft.toLocaleString('en-IN')} cft (Target: 30,925 cft)`);

  // 6. Verify Site Diaries
  console.log('\n--- 6. SITE DIARIES (ALL 10 DATES) ---');
  const sdRes = await client.query(`
    SELECT date, weather_morning, labour_total, jsonb_array_length(materials_received) as mats_count, jsonb_array_length(work_done) as work_count, status
    FROM site_diaries 
    WHERE date IN ('2026-07-17', '2026-07-30', '2026-08-01', '2026-08-04', '2026-08-05', '2026-08-06', '2026-08-07', '2026-08-09', '2026-08-10', '2026-08-11')
    ORDER BY date ASC
  `);
  for (const sd of sdRes.rows) {
    console.log(`  • ${sd.date.toISOString().split('T')[0]} | Weather: ${sd.weather_morning.padEnd(6)} | Labour: ${sd.labour_total} | Mats: ${sd.mats_count} | Works: ${sd.work_count} | Status: ${sd.status}`);
  }

  console.log('\n========================================================================');
  if (expTotal === 910088 && poTotal === 910088 && prTotal === 910088 && totalTrips === 79 && totalCft === 30925) {
    console.log('ALL VERIFICATIONS PASSED PERFECTLY (STATEMENT OF ACCOUNT ₹9,10,088.00 Dr MATCHED)!');
  } else {
    console.log('WARNING: Some totals did not match expected values.');
  }
  console.log('========================================================================\n');

  await client.end();
}

main().catch(console.error);
