const { Client } = require('pg');
const c = new Client({ host: 'localhost', port: 5432, database: 'kipl_projectos', user: 'kipl_user', password: 'PePH6FaCgFYgwEkb4xDy' });

async function verify() {
  await c.connect();
  console.log('\n================ ALAMDAR STONE CRUSHER SEED VERIFICATION ================');

  // 1. Vendor
  const vendor = await c.query("SELECT id, name, category, gstin, pan, phone, email, bank_account FROM vendors WHERE name = 'Alamdar Stone Crusher'");
  console.log('\n1. VENDOR:');
  console.log(vendor.rows[0]);

  // 2. Purchase Order & Items
  const po = await c.query("SELECT id, po_number, vendor_name, work_component, grand_total, status FROM purchase_orders WHERE po_number = 'PO-KIPL-2025-0004'");
  console.log('\n2. PURCHASE ORDER:');
  console.log(po.rows[0]);
  if (po.rows[0]) {
    const poItems = await c.query("SELECT item_description, quantity, unit, unit_rate, taxable_amount, total_amount, received_qty FROM purchase_order_items WHERE purchase_order_id = $1", [po.rows[0].id]);
    console.log('PO ITEMS:', poItems.rows);
  }

  // 3. Goods Receipt Notes & Items
  const grns = await c.query("SELECT grn_number, received_date, challan_number, invoice_number, vehicle_number, received_by_name FROM goods_receipt_notes WHERE invoice_number = '005' ORDER BY received_date ASC");
  console.log('\n3. GOODS RECEIPT NOTES (GRN):');
  console.log(grns.rows);

  // 4. Material Register (Clause 55)
  const matReg = await c.query("SELECT date, material, unit, received_qty, consumed_qty, remarks FROM material_register WHERE remarks LIKE '%Alamdar Stone Crusher Bill #005%' ORDER BY date ASC, remarks ASC");
  console.log(`\n4. MATERIAL REGISTER ENTRIES (${matReg.rows.length} entries):`);
  console.log(matReg.rows);

  // Material summary
  const summary = await c.query(`
    SELECT material, unit, SUM(received_qty) as total_received, SUM(consumed_qty) as total_consumed, (SUM(received_qty) - SUM(consumed_qty)) as balance
    FROM material_register
    WHERE remarks LIKE '%Alamdar Stone Crusher Bill #005%'
    GROUP BY material, unit
  `);
  console.log('\nMATERIAL REGISTER TOTALS:');
  console.log(summary.rows);

  // 5. Payment Requisition & Item
  const pr = await c.query("SELECT pr_number, title, pr_date, site_location, total_order_cost, total_amount_to_pay, procurement_status, accounts_status, status FROM payment_requisitions WHERE pr_number = 'PR-2026-0002'");
  console.log('\n5. PAYMENT REQUISITION:');
  console.log(pr.rows[0]);
  if (pr.rows[0]) {
    const prItems = await c.query("SELECT sr_no, vendor_name, description, material_or_services, is_msme, total_order_cost, amount_to_pay, balance_amount, site_location, remark, mode_of_payment FROM payment_requisition_items");
    console.log('PR ITEMS:', prItems.rows);
  }

  // 6. Expense / Bill in Accounting
  const expense = await c.query("SELECT bill_no, bill_date, category, gross_amount, net_payable, payment_mode, status, description FROM expenses WHERE bill_no = '005'");
  console.log('\n6. ACCOUNTING EXPENSE / BILL:');
  console.log(expense.rows[0]);

  // 7. Site Diaries
  const diaries = await c.query("SELECT date, submitted_by, materials_received, work_done FROM site_diaries WHERE date IN ('2025-12-26', '2026-01-09') ORDER BY date ASC");
  console.log('\n7. SITE DIARIES (Date-Wise Materials Received & Work Done):');
  for (const d of diaries.rows) {
    console.log(`Date: ${d.date.toISOString().split('T')[0]}`);
    console.log('  Materials Received:', JSON.stringify(d.materials_received));
    console.log('  Work Done:', JSON.stringify(d.work_done));
  }

  console.log('\n================ VERIFICATION COMPLETED SUCCESSFULLY ================');
  await c.end();
}

verify().catch(console.error);
