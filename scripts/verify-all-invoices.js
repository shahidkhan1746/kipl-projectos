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
  console.log('================================================================');
  console.log('SUPABASE MATERIAL REGISTER VERIFICATION (BILLS #005 & #1090)');
  console.log('================================================================');

  for (const inv of ['005', '1090']) {
    console.log(`\n--- INVOICE BILL NO: ${inv} ---`);
    const trips = await c.query(`
      SELECT 
        date, vehicle_no, material, received_qty, rate, amount, 
        challan_no, grn_id, site_zone, purpose
      FROM material_register 
      WHERE invoice_no = $1
      ORDER BY date, vehicle_no
    `, [inv]);

    console.log(`Found ${trips.rows.length} trips:`);
    let totalQty = 0;
    let totalAmt = 0;
    for (const t of trips.rows) {
      const q = parseFloat(t.received_qty);
      const r = parseFloat(t.rate);
      const a = parseFloat(t.amount);
      totalQty += q;
      totalAmt += a;
      console.log(`  [${t.date.toISOString().split('T')[0]}] Veh: #${t.vehicle_no.padEnd(6)} | ${t.material.padEnd(28)} | Qty: ${q.toString().padStart(5)} cft | Rate: ₹${r.toFixed(2)} | Amt: ₹${a.toFixed(2).padStart(9)} | Challan: ${t.challan_no || 'N/A'}`);
    }
    console.log(`\n  >> Total Trips: ${trips.rows.length}`);
    console.log(`  >> Total Quantity: ${totalQty} cft`);
    console.log(`  >> Total Taxable Amount: ₹${totalAmt.toFixed(2)}`);

    const exp = await c.query("SELECT bill_no, gross_amount, gst_amount, net_payable, status FROM expenses WHERE bill_no = $1", [inv]);
    console.log(`  >> Linked Expense:`, exp.rows[0]);

    const po = await c.query("SELECT po_number, grand_total, status FROM purchase_orders WHERE po_number = $1", [inv === '005' ? 'PO-KIPL-2025-0004' : 'PO-KIPL-2026-0005']);
    console.log(`  >> Linked PO:`, po.rows[0]);

    const pr = await c.query("SELECT pr_number, total_amount_to_pay, status FROM payment_requisitions WHERE pr_number = $1", [inv === '005' ? 'PR-2026-0002' : 'PR-2026-0003']);
    console.log(`  >> Linked PR:`, pr.rows[0]);
  }

  await c.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
