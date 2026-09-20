/**
 * Seeds Alamdar Stone Crusher GST Invoices & Updated Statement of Account:
 * - GST Invoice #1098 (11/08/2026): 774 MT Bajari / CTSB @ ₹750/MT = ₹5,80,500.00 + 5% GST (₹29,025.00) = ₹6,09,525.00
 * - GST Invoice #1099 (11/08/2026): 248 MT Bajari / Over Gauge @ ₹750/MT = ₹1,86,000.00 + 5% GST (₹9,300.00) = ₹1,95,300.00
 * - GST Invoice #1100 (11/08/2026): 32 MT Bajari / Dust @ ₹750/MT = ₹24,000.00 + 5% GST (₹1,200.00) = ₹25,200.00
 * - Bill #148-KB-NISHT (01/08/2026): ₹80,063.00 (Challan non-GST / exempt)
 * 
 * Total Statement of Account Balance: ₹9,10,088.00 Dr (Exact match to Ledger Account!)
 */

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
  console.log('Connected to Supabase PostgreSQL database.');

  try {
    await client.query('BEGIN');

    const projectId = '4a5176c7-0f53-42cc-bbd8-1a7259648a96';
    const vendorId = 'b99e1d96-575d-4213-8d7d-a4be9808e355';

    // 1. Update / Upsert Expenses (Vendor Bills in Accounting)
    console.log('1. Updating Accounting Expenses with official GST Invoices...');
    
    // Bill 1098 (replaces internal Bill 149)
    await client.query(`
      UPDATE expenses
      SET 
        bill_no = '1098',
        bill_date = '2026-08-11',
        gross_amount = 580500.00,
        gst_pct = 5.00,
        gst_amount = 29025.00,
        cgst_amount = 14512.50,
        sgst_amount = 14512.50,
        igst_amount = 0.00,
        net_payable = 609525.00,
        status = 'approved',
        description = 'Alamdar Stone Crusher GST Invoice #1098 (774 MT / 19,350 cft CTSB & WMM against site challan bill #149)',
        remarks = 'GST Invoice #1098 dt 11/08/2026. 774 MT Bajari (HSN 251710) @ ₹750/MT + 5% GST. Balance Dr ₹6,09,525.00. RTGS to J&K Bank Khonmoh A/C 0244020100000164.',
        updated_at = NOW()
      WHERE id = '1111da40-570e-4b11-9e23-786000000149' OR bill_no = '149' OR bill_no = '1098'
    `);

    // Bill 1099 (replaces internal Bill 150)
    await client.query(`
      UPDATE expenses
      SET 
        bill_no = '1099',
        bill_date = '2026-08-11',
        gross_amount = 186000.00,
        gst_pct = 5.00,
        gst_amount = 9300.00,
        cgst_amount = 4650.00,
        sgst_amount = 4650.00,
        igst_amount = 0.00,
        net_payable = 195300.00,
        status = 'approved',
        description = 'Alamdar Stone Crusher GST Invoice #1099 (248 MT / 6,200 cft Bajari / Over Gauge Soling against site challan bill #150)',
        remarks = 'GST Invoice #1099 dt 11/08/2026. 248 MT Bajari (HSN 251710) @ ₹750/MT + 5% GST. Balance Dr ₹1,95,300.00. RTGS to J&K Bank Khonmoh A/C 0244020100000164.',
        updated_at = NOW()
      WHERE id = '1111da40-570e-4b11-9e23-786000000150' OR bill_no = '150' OR bill_no = '1099'
    `);

    // Bill 1100 (replaces internal Bill 151)
    await client.query(`
      UPDATE expenses
      SET 
        bill_no = '1100',
        bill_date = '2026-08-11',
        gross_amount = 24000.00,
        gst_pct = 5.00,
        gst_amount = 1200.00,
        cgst_amount = 600.00,
        sgst_amount = 600.00,
        igst_amount = 0.00,
        net_payable = 25200.00,
        status = 'approved',
        description = 'Alamdar Stone Crusher GST Invoice #1100 (32 MT / 800 cft Bajari / Stone Dust against site challan bill #151)',
        remarks = 'GST Invoice #1100 dt 11/08/2026. 32 MT Bajari (HSN 251710) @ ₹750/MT + 5% GST. Balance Dr ₹25,200.00. RTGS to J&K Bank Khonmoh A/C 0244020100000164.',
        updated_at = NOW()
      WHERE id = '1111da40-570e-4b11-9e23-786000000151' OR bill_no = '151' OR bill_no = '1100'
    `);

    console.log('  Expenses updated.');

    // 2. Update Purchase Orders and Items by po_number
    console.log('2. Updating Purchase Orders & Items to GST amounts & MT quantities...');
    
    // PO-KIPL-2026-0008 (GST Invoice #1098 / Bill #149)
    await client.query(`
      UPDATE purchase_orders
      SET 
        subject = 'Supply of CTSB & WMM Sub-Base (774 MT) — Alamdar Stone Crusher (GST Invoice #1098 / Bill #149)',
        taxable_amount = 580500.00,
        subtotal_amount = 580500.00,
        cgst_amount = 14512.50,
        sgst_amount = 14512.50,
        igst_amount = 0.00,
        total_tax = 29025.00,
        tax_amount = 29025.00,
        grand_total = 609525.00,
        total_amount = 609525.00,
        status = 'completed',
        items = '[{"item_description": "Bajari / CTSB & WMM (HSN 251710)", "quantity": 774, "unit": "MT", "unit_rate": 750.00, "gst_rate": 5.00, "taxable_amount": 580500.00, "gst_amount": 29025.00, "total_amount": 609525.00, "site_ref": "49 Tippers (19,350 cft) against Bill #149"}]'::jsonb,
        remarks = 'GST Invoice #1098 (Internal Bill #149) - 774 MT Bajari/CTSB @ ₹750/MT + 5% GST = ₹6,09,525.00.',
        notes = 'GST Invoice #1098 (Internal Bill #149) - 774 MT Bajari/CTSB @ ₹750/MT + 5% GST = ₹6,09,525.00.',
        updated_at = NOW()
      WHERE po_number = 'PO-KIPL-2026-0008'
    `);

    const po008 = await client.query("SELECT id FROM purchase_orders WHERE po_number = 'PO-KIPL-2026-0008'");
    if (po008.rows.length > 0) {
      await client.query('DELETE FROM purchase_order_items WHERE purchase_order_id = $1', [po008.rows[0].id]);
      await client.query(`
        INSERT INTO purchase_order_items (
          id, purchase_order_id, item_description, hsn_code, quantity, unit,
          unit_rate, discount_percent, gst_rate, taxable_amount, gst_amount, total_amount, received_qty,
          created_at, updated_at
        ) VALUES (
          gen_random_uuid(), $1, 'Bajari / CTSB & WMM (HSN 251710)', '251710', 774.000, 'MT',
          750.00, 0.00, 5.00, 580500.00, 29025.00, 609525.00, 774.000,
          NOW(), NOW()
        )
      `, [po008.rows[0].id]);
    }

    // PO-KIPL-2026-0009 (GST Invoice #1099 / Bill #150)
    await client.query(`
      UPDATE purchase_orders
      SET 
        subject = 'Supply of Over Gauge Soling / Bajari (248 MT) — Alamdar Stone Crusher (GST Invoice #1099 / Bill #150)',
        taxable_amount = 186000.00,
        subtotal_amount = 186000.00,
        cgst_amount = 4650.00,
        sgst_amount = 4650.00,
        igst_amount = 0.00,
        total_tax = 9300.00,
        tax_amount = 9300.00,
        grand_total = 195300.00,
        total_amount = 195300.00,
        status = 'completed',
        items = '[{"item_description": "Bajari / Over Gauge Soling (HSN 251710)", "quantity": 248, "unit": "MT", "unit_rate": 750.00, "gst_rate": 5.00, "taxable_amount": 186000.00, "gst_amount": 9300.00, "total_amount": 195300.00, "site_ref": "16 Tippers (6,200 cft) against Bill #150"}]'::jsonb,
        remarks = 'GST Invoice #1099 (Internal Bill #150) - 248 MT Bajari/Soling @ ₹750/MT + 5% GST = ₹1,95,300.00.',
        notes = 'GST Invoice #1099 (Internal Bill #150) - 248 MT Bajari/Soling @ ₹750/MT + 5% GST = ₹1,95,300.00.',
        updated_at = NOW()
      WHERE po_number = 'PO-KIPL-2026-0009'
    `);

    const po009 = await client.query("SELECT id FROM purchase_orders WHERE po_number = 'PO-KIPL-2026-0009'");
    if (po009.rows.length > 0) {
      await client.query('DELETE FROM purchase_order_items WHERE purchase_order_id = $1', [po009.rows[0].id]);
      await client.query(`
        INSERT INTO purchase_order_items (
          id, purchase_order_id, item_description, hsn_code, quantity, unit,
          unit_rate, discount_percent, gst_rate, taxable_amount, gst_amount, total_amount, received_qty,
          created_at, updated_at
        ) VALUES (
          gen_random_uuid(), $1, 'Bajari / Over Gauge Soling (HSN 251710)', '251710', 248.000, 'MT',
          750.00, 0.00, 5.00, 186000.00, 9300.00, 195300.00, 248.000,
          NOW(), NOW()
        )
      `, [po009.rows[0].id]);
    }

    // PO-KIPL-2026-0010 (GST Invoice #1100 / Bill #151)
    await client.query(`
      UPDATE purchase_orders
      SET 
        subject = 'Supply of Stone Dust / Bajari (32 MT) — Alamdar Stone Crusher (GST Invoice #1100 / Bill #151)',
        taxable_amount = 24000.00,
        subtotal_amount = 24000.00,
        cgst_amount = 600.00,
        sgst_amount = 600.00,
        igst_amount = 0.00,
        total_tax = 1200.00,
        tax_amount = 1200.00,
        grand_total = 25200.00,
        total_amount = 25200.00,
        status = 'completed',
        items = '[{"item_description": "Bajari / Stone Dust (HSN 251710)", "quantity": 32, "unit": "MT", "unit_rate": 750.00, "gst_rate": 5.00, "taxable_amount": 24000.00, "gst_amount": 1200.00, "total_amount": 25200.00, "site_ref": "2 Tippers (800 cft) against Bill #151"}]'::jsonb,
        remarks = 'GST Invoice #1100 (Internal Bill #151) - 32 MT Bajari/Dust @ ₹750/MT + 5% GST = ₹25,200.00.',
        notes = 'GST Invoice #1100 (Internal Bill #151) - 32 MT Bajari/Dust @ ₹750/MT + 5% GST = ₹25,200.00.',
        updated_at = NOW()
      WHERE po_number = 'PO-KIPL-2026-0010'
    `);

    const po010 = await client.query("SELECT id FROM purchase_orders WHERE po_number = 'PO-KIPL-2026-0010'");
    if (po010.rows.length > 0) {
      await client.query('DELETE FROM purchase_order_items WHERE purchase_order_id = $1', [po010.rows[0].id]);
      await client.query(`
        INSERT INTO purchase_order_items (
          id, purchase_order_id, item_description, hsn_code, quantity, unit,
          unit_rate, discount_percent, gst_rate, taxable_amount, gst_amount, total_amount, received_qty,
          created_at, updated_at
        ) VALUES (
          gen_random_uuid(), $1, 'Bajari / Stone Dust (HSN 251710)', '251710', 32.000, 'MT',
          750.00, 0.00, 5.00, 24000.00, 1200.00, 25200.00, 32.000,
          NOW(), NOW()
        )
      `, [po010.rows[0].id]);
    }

    console.log('  Purchase Orders updated.');

    // 3. Update Goods Receipt Notes (GRNs)
    console.log('3. Updating GRN invoice reference numbers...');
    await client.query(`
      UPDATE goods_receipt_notes
      SET invoice_number = '1098 (Bill #149)', remarks = remarks || ' [GST Invoice #1098, 774 MT]', updated_at = NOW()
      WHERE grn_number = 'GRN-2026-0008'
    `);
    await client.query(`
      UPDATE goods_receipt_notes
      SET invoice_number = '1099 (Bill #150)', remarks = remarks || ' [GST Invoice #1099, 248 MT]', updated_at = NOW()
      WHERE grn_number = 'GRN-2026-0009'
    `);
    await client.query(`
      UPDATE goods_receipt_notes
      SET invoice_number = '1100 (Bill #151)', remarks = remarks || ' [GST Invoice #1100, 32 MT]', updated_at = NOW()
      WHERE grn_number = 'GRN-2026-0010'
    `);
    console.log('  GRNs updated.');

    // 4. Update Payment Requisitions (PR-2026-0007, 0008, 0009)
    console.log('4. Updating Payment Requisitions to GST net totals...');
    
    // PR 1098
    await client.query(`
      UPDATE payment_requisitions
      SET 
        title = 'Payment Requisition for CTSB (774 MT / 19,350 cft) — Alamdar Stone Crusher (GST Invoice #1098 / Bill #149)',
        total_order_cost = 609525.00,
        total_amount_to_pay = 609525.00,
        accounts_remarks = 'GST Invoice #1098 dt 11/08/2026 verified. Total ₹6,09,525.00 (Taxable ₹5,80,500.00 + UTGST ₹14,512.50 + CGST ₹14,512.50) passed for RTGS to J&K Bank Khonmoh A/C 0244020100000164.',
        notes = 'Payment against Alamdar Stone Crusher GST Invoice #1098 dated 11/08/2026 (Internal Bill #149).',
        updated_at = NOW()
      WHERE pr_number = 'PR-2026-0007'
    `);

    const pr007 = await client.query("SELECT id FROM payment_requisitions WHERE pr_number = 'PR-2026-0007'");
    if (pr007.rows.length > 0) {
      await client.query(`
        UPDATE payment_requisition_items
        SET 
          description = 'Supply of 774 MT Bajari / CTSB @ ₹750/MT + 5% GST for Nishat STP road subbase',
          total_order_cost = 609525.00,
          amount_to_pay = 609525.00,
          remark = 'Against GST Invoice #1098 (Bill #149) dt. 11/08/2026',
          against_ref = 'GST Invoice #1098 (GRN-2026-0008)',
          updated_at = NOW()
        WHERE payment_requisition_id = $1
      `, [pr007.rows[0].id]);
    }

    // PR 1099
    await client.query(`
      UPDATE payment_requisitions
      SET 
        title = 'Payment Requisition for Over Gauge Soling (248 MT / 6,200 cft) — Alamdar Stone Crusher (GST Invoice #1099 / Bill #150)',
        total_order_cost = 195300.00,
        total_amount_to_pay = 195300.00,
        accounts_remarks = 'GST Invoice #1099 dt 11/08/2026 verified. Total ₹1,95,300.00 (Taxable ₹1,86,000.00 + UTGST ₹4,650.00 + CGST ₹4,650.00) passed for RTGS to J&K Bank Khonmoh A/C 0244020100000164.',
        notes = 'Payment against Alamdar Stone Crusher GST Invoice #1099 dated 11/08/2026 (Internal Bill #150).',
        updated_at = NOW()
      WHERE pr_number = 'PR-2026-0008'
    `);

    const pr008 = await client.query("SELECT id FROM payment_requisitions WHERE pr_number = 'PR-2026-0008'");
    if (pr008.rows.length > 0) {
      await client.query(`
        UPDATE payment_requisition_items
        SET 
          description = 'Supply of 248 MT Bajari / Over Gauge Soling @ ₹750/MT + 5% GST for Shalimar site',
          total_order_cost = 195300.00,
          amount_to_pay = 195300.00,
          remark = 'Against GST Invoice #1099 (Bill #150) dt. 11/08/2026',
          against_ref = 'GST Invoice #1099 (GRN-2026-0009)',
          updated_at = NOW()
        WHERE payment_requisition_id = $1
      `, [pr008.rows[0].id]);
    }

    // PR 1100
    await client.query(`
      UPDATE payment_requisitions
      SET 
        title = 'Payment Requisition for Stone Dust (32 MT / 800 cft) — Alamdar Stone Crusher (GST Invoice #1100 / Bill #151)',
        total_order_cost = 25200.00,
        total_amount_to_pay = 25200.00,
        accounts_remarks = 'GST Invoice #1100 dt 11/08/2026 verified. Total ₹25,200.00 (Taxable ₹24,000.00 + UTGST ₹600.00 + CGST ₹600.00) passed for RTGS to J&K Bank Khonmoh A/C 0244020100000164.',
        notes = 'Payment against Alamdar Stone Crusher GST Invoice #1100 dated 11/08/2026 (Internal Bill #151).',
        updated_at = NOW()
      WHERE pr_number = 'PR-2026-0009'
    `);

    const pr010 = await client.query("SELECT id FROM payment_requisitions WHERE pr_number = 'PR-2026-0009'");
    if (pr010.rows.length > 0) {
      await client.query(`
        UPDATE payment_requisition_items
        SET 
          description = 'Supply of 32 MT Bajari / Stone Dust @ ₹750/MT + 5% GST for Nishat STP pipe bedding',
          total_order_cost = 25200.00,
          amount_to_pay = 25200.00,
          remark = 'Against GST Invoice #1100 (Bill #151) dt. 11/08/2026',
          against_ref = 'GST Invoice #1100 (GRN-2026-0010)',
          updated_at = NOW()
        WHERE payment_requisition_id = $1
      `, [pr010.rows[0].id]);
    }

    console.log('  Payment Requisitions updated.');

    // 5. Update Material Register Cross-References
    console.log('5. Updating Material Register delivery trip references to GST Invoices...');
    await client.query(`
      UPDATE material_register
      SET invoice_no = '1098 / 149', updated_at = NOW()
      WHERE invoice_no IN ('149', '1098 / 149')
    `);

    await client.query(`
      UPDATE material_register
      SET invoice_no = '1099 / 150', updated_at = NOW()
      WHERE invoice_no IN ('150', '1099 / 150')
    `);

    await client.query(`
      UPDATE material_register
      SET invoice_no = '1100 / 151', updated_at = NOW()
      WHERE invoice_no IN ('151', '1100 / 151')
    `);

    console.log('  Material Register updated.');

    // 6. Update Site Diaries materials_received references
    console.log('6. Updating Site Diaries materials_received references...');
    const dates = ['2026-07-17', '2026-08-04', '2026-08-05', '2026-08-06', '2026-08-07', '2026-08-09', '2026-08-10', '2026-08-11'];
    
    for (const dt of dates) {
      const res = await client.query('SELECT id, materials_received FROM site_diaries WHERE project_id = $1 AND date = $2', [projectId, dt]);
      if (res.rows.length > 0) {
        let mats = res.rows[0].materials_received || [];
        mats = mats.map(m => {
          if (m.supplier && m.supplier.includes('149')) {
            m.supplier = m.supplier.replace(/Bill #149/g, 'GST Invoice #1098 / Bill #149');
          }
          if (m.supplier && m.supplier.includes('150')) {
            m.supplier = m.supplier.replace(/Bill #150/g, 'GST Invoice #1099 / Bill #150');
          }
          if (m.supplier && m.supplier.includes('151')) {
            m.supplier = m.supplier.replace(/Bill #151/g, 'GST Invoice #1100 / Bill #151');
          }
          return m;
        });
        await client.query('UPDATE site_diaries SET materials_received = $1::jsonb, updated_at = NOW() WHERE id = $2', [JSON.stringify(mats), res.rows[0].id]);
      }
    }
    console.log('  Site Diaries updated.');

    await client.query('COMMIT');
    console.log('\n=== TRANSACTION COMMITTED SUCCESSFULLY ===');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('ERROR during seeding (rolled back):', err);
    throw err;
  } finally {
    await client.end();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
