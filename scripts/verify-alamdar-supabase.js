/**
 * Verifies that Alamdar Stone Crusher Bill #005 data is present across all modules in Supabase Production.
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
  console.log('=== VERIFYING SUPABASE PRODUCTION SEED ===\n');

  // 1. Vendor
  const v = await c.query("SELECT id, name, gstin, pan, phone, address, bank_account FROM vendors WHERE name = 'Alamdar Stone Crusher'");
  console.log('1. Vendor:');
  console.log(v.rows[0]);

  // 2. Master Dropdowns
  const dd = await c.query("SELECT dropdown_type, label, value FROM master_dropdown_options WHERE value IN ('cft', 'Khak Bajri', 'Stone Dust / Crushed Sand', 'Alamdar Stone Crusher')");
  console.log('\n2. Master Dropdown Options:');
  console.log(dd.rows);

  // 3. Purchase Order
  const po = await c.query("SELECT id, po_number, vendor_name, total_amount, grand_total, status FROM purchase_orders WHERE po_number = 'PO-KIPL-2025-0004'");
  console.log('\n3. Purchase Order:');
  console.log(po.rows[0]);

  const poi = await c.query("SELECT item_description, quantity, unit, unit_rate, total_amount FROM purchase_order_items WHERE purchase_order_id = $1", [po.rows[0].id]);
  console.log('   PO Items:', poi.rows);

  // 4. GRNs
  const grn = await c.query("SELECT id, grn_number, received_date, invoice_number, vehicle_number FROM goods_receipt_notes WHERE purchase_order_id = $1 ORDER BY received_date ASC", [po.rows[0].id]);
  console.log('\n4. Goods Receipt Notes:');
  console.log(grn.rows);

  // 5. Material Register
  const mr = await c.query("SELECT date, material, unit, received_qty, vehicle_no, invoice_no, remarks FROM material_register WHERE remarks ILIKE '%Bill #005%' ORDER BY date, vehicle_no");
  console.log(`\n5. Material Register (Total entries: ${mr.rows.length}):`);
  mr.rows.forEach(r => console.log(`   [${r.date.toISOString().split('T')[0]}] ${r.material} - ${r.received_qty} ${r.unit} (Tipper #${r.vehicle_no})`));

  // 6. Payment Requisition
  const pr = await c.query("SELECT pr_number, title, total_amount_to_pay, status, procurement_status, accounts_status FROM payment_requisitions WHERE pr_number = 'PR-2026-0002'");
  console.log('\n6. Payment Requisition:');
  console.log(pr.rows[0]);

  // 7. Expenses
  const exp = await c.query("SELECT bill_no, bill_date, gross_amount, net_payable, payment_mode, status, description FROM expenses WHERE bill_no = '005'");
  console.log('\n7. Accounting Expense:');
  console.log(exp.rows[0]);

  // 8. Site Diaries
  const diaries = await c.query("SELECT date, materials_received, work_done FROM site_diaries WHERE date IN ('2025-12-26', '2026-01-09') ORDER BY date ASC");
  console.log('\n8. Site Diaries:');
  diaries.rows.forEach(d => {
    console.log(`   [${d.date.toISOString().split('T')[0]}] Materials:`, d.materials_received);
  });

  await c.end();
}

main().catch(console.error);
