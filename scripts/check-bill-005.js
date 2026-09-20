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

async function check() {
  await c.connect();
  console.log('--- Checking Material Register for Bill 005: ---');
  const mr = await c.query("SELECT id, date, material, unit, received_qty, rate, amount, purpose, vehicle_no, invoice_no, supplier_name FROM material_register WHERE invoice_no = '005' OR remarks ILIKE '%005%' ORDER BY date, vehicle_no");
  console.log('Count:', mr.rows.length);
  console.log(JSON.stringify(mr.rows, null, 2));

  console.log('\n--- Checking Purchase Orders: ---');
  const po = await c.query("SELECT id, po_number, total_amount, taxable_amount, grand_total, status, items FROM purchase_orders WHERE po_number ILIKE '%0004%' OR subject ILIKE '%005%'");
  console.log(JSON.stringify(po.rows, null, 2));

  console.log('\n--- Checking Expenses: ---');
  const exp = await c.query("SELECT id, bill_no, date, gross_amount, gst_amount, net_payable, status, remarks FROM expenses WHERE bill_no ILIKE '%005%' OR bill_no = '005'");
  console.log(JSON.stringify(exp.rows, null, 2));

  console.log('\n--- Checking Payment Requisitions: ---');
  const pr = await c.query("SELECT id, pr_number, total_order_cost, total_amount_to_pay, status FROM payment_requisitions WHERE pr_number ILIKE '%0002%'");
  console.log(JSON.stringify(pr.rows, null, 2));

  console.log('\n--- Checking PR Items: ---');
  const pri = await c.query("SELECT * FROM payment_requisition_items WHERE payment_requisition_id IN (SELECT id FROM payment_requisitions WHERE pr_number ILIKE '%0002%')");
  console.log(JSON.stringify(pri.rows, null, 2));

  console.log('\n--- Checking GRNs: ---');
  const grn = await c.query("SELECT id, grn_number, invoice_number, challan_number FROM goods_receipt_notes WHERE invoice_number ILIKE '%005%' OR grn_number IN ('GRN-2025-0002', 'GRN-2026-0003')");
  console.log(JSON.stringify(grn.rows, null, 2));

  console.log('\n--- Checking GRN Items: ---');
  const grni = await c.query("SELECT * FROM goods_receipt_note_items WHERE grn_id IN (SELECT id FROM goods_receipt_notes WHERE invoice_number ILIKE '%005%' OR grn_number IN ('GRN-2025-0002', 'GRN-2026-0003'))");
  console.log(JSON.stringify(grni.rows, null, 2));
  console.log('\n--- Material Register Columns: ---');
  const cols = await c.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'material_register' ORDER BY ordinal_position");
  console.log(cols.rows.map(r => `${r.column_name} (${r.data_type})`).join(', '));

  await c.end();
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
