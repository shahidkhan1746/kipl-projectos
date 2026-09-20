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
  console.log('========================================================================');
  console.log('SUPABASE FULL INVOICE & MATERIAL REGISTER VERIFICATION');
  console.log('========================================================================\n');

  const invoices = [
    { no: 'GSTSI2627/904', name: 'Sapcon Steels Private Limited', expNo: 'GSTSI2627/904', poNo: 'KIPL/38.5 MLD STP_J&K-DAL LAKE, SGR/PO/376/2026-27' },
    { no: '1880', name: 'Wani Cement & Iron Store', expNo: '1880', poNo: 'PO-KIPL-2026-0006' },
    { no: '005', name: 'Alamdar Stone Crusher (Bill #005)', expNo: '005', poNo: 'PO-KIPL-2025-0004' },
    { no: '1090', name: 'Alamdar Stone Crusher (Bill #1090)', expNo: '1090', poNo: 'PO-KIPL-2026-0005' }
  ];

  for (const inv of invoices) {
    console.log(`------------------------------------------------------------------------`);
    console.log(`>>> INVOICE: ${inv.no} (${inv.name})`);
    console.log(`------------------------------------------------------------------------`);

    // Material Register
    const mr = await c.query(`
      SELECT 
        date, vehicle_no, material, unit, received_qty, rate, amount,
        challan_no, grn_id, site_zone, purpose, wbs_code
      FROM material_register
      WHERE invoice_no = $1
      ORDER BY date, vehicle_no
    `, [inv.no]);

    console.log(`  [Material Register Entries]: ${mr.rows.length} rows`);
    let totQty = 0;
    let totAmt = 0;
    for (const r of mr.rows) {
      const q = parseFloat(r.received_qty);
      const rt = parseFloat(r.rate);
      const a = parseFloat(r.amount);
      totQty += q;
      totAmt += a;
      console.log(`    • ${r.date.toISOString().split('T')[0]} | Veh #${(r.vehicle_no||'').padEnd(10)} | ${(r.material||'').padEnd(28)} | ${q.toString().padStart(8)} ${r.unit} @ ₹${rt.toFixed(2).padStart(6)} = ₹${a.toFixed(2).padStart(12)} | Challan: ${r.challan_no || 'N/A'} | WBS: ${r.wbs_code || 'N/A'}`);
    }
    console.log(`    -> Total Qty: ${totQty} | Total Amount: ₹${totAmt.toFixed(2)}`);

    // PO
    const po = await c.query(`
      SELECT po_number, order_date, total_amount, grand_total, status
      FROM purchase_orders
      WHERE po_number = $1
    `, [inv.poNo]);
    if (po.rows.length > 0) {
      console.log(`  [Linked PO]: ${po.rows[0].po_number} | Order Date: ${po.rows[0].order_date ? po.rows[0].order_date.toISOString().split('T')[0] : 'N/A'} | Grand Total: ₹${parseFloat(po.rows[0].grand_total).toFixed(2)} | Status: ${po.rows[0].status}`);
    } else {
      console.log(`  [Linked PO]: Not found`);
    }

    // GRN
    const grn = await c.query(`
      SELECT grn_number, received_date, challan_number, invoice_number, vehicle_number
      FROM goods_receipt_notes
      WHERE invoice_number = $1
    `, [inv.no]);
    if (grn.rows.length > 0) {
      console.log(`  [Linked GRN]: ${grn.rows[0].grn_number} | Received: ${grn.rows[0].received_date.toISOString().split('T')[0]} | Challan: ${grn.rows[0].challan_number} | Vehicle: ${grn.rows[0].vehicle_number}`);
    } else {
      console.log(`  [Linked GRN]: Not found`);
    }

    // PR
    const pr = await c.query(`
      SELECT pr_number, total_order_cost, total_amount_to_pay, status
      FROM payment_requisitions
      WHERE title ILIKE $1 OR notes ILIKE $1
    `, [`%${inv.no}%`]);
    if (pr.rows.length > 0) {
      console.log(`  [Linked PR]: ${pr.rows[0].pr_number} | Amount to Pay: ₹${parseFloat(pr.rows[0].total_amount_to_pay).toFixed(2)} | Status: ${pr.rows[0].status}`);
    } else {
      console.log(`  [Linked PR]: Not found`);
    }

    // Expense
    const exp = await c.query(`
      SELECT bill_no, date, gross_amount, gst_amount, net_payable, status
      FROM expenses
      WHERE bill_no = $1
    `, [inv.expNo]);
    if (exp.rows.length > 0) {
      console.log(`  [Linked Expense]: Bill #${exp.rows[0].bill_no} | Gross: ₹${parseFloat(exp.rows[0].gross_amount).toFixed(2)} | GST: ₹${parseFloat(exp.rows[0].gst_amount).toFixed(2)} | Net: ₹${parseFloat(exp.rows[0].net_payable).toFixed(2)} | Status: ${exp.rows[0].status}`);
    } else {
      console.log(`  [Linked Expense]: Not found`);
    }
    console.log('');
  }

  await c.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
