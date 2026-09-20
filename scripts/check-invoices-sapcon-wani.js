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
  console.log('Connected to Supabase. Querying for Sapcon and Wani / 904 and 1880...\n');

  console.log('=== VENDORS ===');
  const vendors = await c.query("SELECT id, name, trade_name, gstin, phone, bank_account FROM vendors WHERE name ILIKE '%sapcon%' OR trade_name ILIKE '%sapcon%' OR name ILIKE '%wani%' OR trade_name ILIKE '%wani%'");
  console.log(JSON.stringify(vendors.rows, null, 2));

  console.log('\n=== MATERIAL REGISTER (Searching for 904, 1880, TMT, JK18D3699, JK01AL1373, Sapcon, Wani) ===');
  const mr = await c.query(`
    SELECT id, date, material, unit, received_qty, rate, amount, purpose, vehicle_no, invoice_no, supplier_name, challan_no, grn_id, remarks
    FROM material_register
    WHERE invoice_no ILIKE '%904%' 
       OR invoice_no ILIKE '%1880%'
       OR vehicle_no ILIKE '%3699%'
       OR vehicle_no ILIKE '%1373%'
       OR supplier_name ILIKE '%sapcon%'
       OR supplier_name ILIKE '%wani%'
       OR remarks ILIKE '%904%'
       OR remarks ILIKE '%1880%'
       OR material ILIKE '%TMT%'
    ORDER BY date
  `);
  console.log('Count:', mr.rows.length);
  console.log(JSON.stringify(mr.rows, null, 2));

  console.log('\n=== PURCHASE ORDERS ===');
  const po = await c.query(`
    SELECT id, po_number, vendor_name, order_date, total_amount, taxable_amount, grand_total, status, remarks, items
    FROM purchase_orders
    WHERE po_number ILIKE '%376%'
       OR po_number ILIKE '%904%'
       OR po_number ILIKE '%1880%'
       OR vendor_name ILIKE '%sapcon%'
       OR vendor_name ILIKE '%wani%'
       OR subject ILIKE '%TMT%'
  `);
  console.log('Count:', po.rows.length);
  console.log(JSON.stringify(po.rows, null, 2));

  console.log('\n=== PURCHASE ORDER ITEMS ===');
  const poi = await c.query("SELECT * FROM purchase_order_items WHERE purchase_order_id = '48a34f85-a654-415f-bafd-8bb32a65b1d4'");
  console.log('Count:', poi.rows.length);
  console.log(JSON.stringify(poi.rows, null, 2));

  console.log('\n=== SITE DIARIES (Checking 2026-08-12 and 2026-09-15) ===');
  const diaries = await c.query("SELECT date, materials_received, work_done FROM site_diaries WHERE date IN ('2026-08-12', '2026-09-15') ORDER BY date");
  console.log('Count:', diaries.rows.length);
  console.log(JSON.stringify(diaries.rows, null, 2));

  console.log('\n=== EXPENSES ===');
  const exp = await c.query(`
    SELECT id, bill_no, date, gross_amount, gst_amount, net_payable, status, remarks
    FROM expenses
    WHERE bill_no ILIKE '%904%'
       OR bill_no ILIKE '%1880%'
       OR remarks ILIKE '%sapcon%'
       OR remarks ILIKE '%wani%'
  `);
  console.log('Count:', exp.rows.length);
  console.log(JSON.stringify(exp.rows, null, 2));

  console.log('\n=== PAYMENT REQUISITIONS ===');
  const pr = await c.query(`
    SELECT id, pr_number, title, total_order_cost, total_amount_to_pay, status, notes
    FROM payment_requisitions
    WHERE title ILIKE '%sapcon%'
       OR title ILIKE '%wani%'
       OR title ILIKE '%TMT%'
       OR notes ILIKE '%904%'
       OR notes ILIKE '%1880%'
  `);
  console.log('Count:', pr.rows.length);
  console.log(JSON.stringify(pr.rows, null, 2));

  await c.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
