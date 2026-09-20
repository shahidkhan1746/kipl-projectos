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

async function verify() {
  await c.connect();
  console.log('--- SUPABASE VERIFICATION FOR BILL #1090 ---');

  const vendor = await c.query("SELECT trade_name, gstin, bank_account FROM vendors WHERE trade_name ILIKE '%Alamdar%'");
  console.log('Vendor:', vendor.rows[0]);

  const po = await c.query("SELECT po_number, grand_total, status, total_amount FROM purchase_orders WHERE po_number = 'PO-KIPL-2026-0005'");
  console.log('PO:', po.rows[0]);

  const grn = await c.query("SELECT grn_number, invoice_number, vehicle_number FROM goods_receipt_notes WHERE grn_number = 'GRN-2026-0004'");
  console.log('GRN:', grn.rows[0]);

  const mr = await c.query("SELECT COUNT(*)::int as trip_count, SUM(received_qty)::numeric as total_qty, SUM(amount)::numeric as total_val FROM material_register WHERE invoice_no = '1090'");
  console.log('Material Register:', mr.rows[0]);

  const pr = await c.query("SELECT pr_number, total_order_cost, total_amount_to_pay, status FROM payment_requisitions WHERE pr_number = 'PR-2026-0003'");
  console.log('PR:', pr.rows[0]);

  const exp = await c.query("SELECT bill_no, gross_amount, gst_amount, net_payable, status FROM expenses WHERE bill_no = '1090'");
  console.log('Expense:', exp.rows[0]);

  const trips = await c.query("SELECT date, vehicle_no, material, received_qty, rate, amount FROM material_register WHERE invoice_no = '1090' ORDER BY date, vehicle_no");
  console.log(`Verified ${trips.rows.length} individual trip rows in Material Register.`);

  await c.end();
}

verify().catch(err => {
  console.error(err);
  process.exit(1);
});
