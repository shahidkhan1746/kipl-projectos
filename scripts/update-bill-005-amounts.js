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
  console.log('Connected to Supabase production.');

  await c.query('BEGIN');

  try {
    const grn1 = 'd4d4da40-570e-4b11-9e23-786000000001'; // GRN-2025-0002
    const grn2 = 'd4d4da40-570e-4b11-9e23-786000000002'; // GRN-2026-0003

    // Update the 9 Khak Bajri trips on 26/12/2025
    console.log('Updating 9 Khak Bajri trips for Bill #005...');
    const resKhak = await c.query(`
      UPDATE material_register
      SET
        rate = 17.50,
        amount = received_qty * 17.50,
        purpose = 'Sewer pipeline trenching, bedding and pipe laying at Shalimar site',
        challan_no = 'CH-ALM-20251226',
        grn_id = $1,
        wbs_code = 'WBS-SHAL-SEW',
        updated_at = NOW()
      WHERE invoice_no = '005' AND material ILIKE '%Khak%'
      RETURNING id, vehicle_no, received_qty, rate, amount, challan_no, purpose
    `, [grn1]);

    console.log(`Updated ${resKhak.rows.length} Khak Bajri rows:`);
    resKhak.rows.forEach(r => {
      console.log(`  Veh #${r.vehicle_no}: ${r.received_qty} cft @ ₹${r.rate} = ₹${r.amount}`);
    });

    // Update the 1 Dust Screen trip on 09/01/2026
    console.log('\nUpdating 1 Dust Screen trip for Bill #005...');
    const resDust = await c.query(`
      UPDATE material_register
      SET
        rate = 25.00,
        amount = received_qty * 25.00,
        purpose = 'Sewer pipe joint encasement, screen bedding and backfilling at Shalimar site',
        challan_no = 'CH-ALM-20260109',
        grn_id = $1,
        wbs_code = 'WBS-SHAL-SEW',
        updated_at = NOW()
      WHERE invoice_no = '005' AND (material ILIKE '%Dust%' OR material ILIKE '%Sand%')
      RETURNING id, vehicle_no, received_qty, rate, amount, challan_no, purpose
    `, [grn2]);

    console.log(`Updated ${resDust.rows.length} Dust Screen row:`);
    resDust.rows.forEach(r => {
      console.log(`  Veh #${r.vehicle_no}: ${r.received_qty} cft @ ₹${r.rate} = ₹${r.amount}`);
    });

    // Verify totals
    const check = await c.query(`
      SELECT 
        COUNT(*)::int as trip_count,
        SUM(received_qty)::numeric as total_qty,
        SUM(amount)::numeric as total_amount
      FROM material_register
      WHERE invoice_no = '005'
    `);
    console.log('\n--- Bill #005 Material Register Totals in Supabase: ---');
    console.log(check.rows[0]);

    // Update Bill 1090 challan_no and wbs_code as well
    console.log('\nUpdating Bill #1090 challan_no & wbs_code...');
    const res1090 = await c.query(`
      UPDATE material_register
      SET
        challan_no = 'CH-ALM-202606',
        wbs_code = 'WBS-ROADS-SUBBASE',
        updated_at = NOW()
      WHERE invoice_no = '1090'
      RETURNING id
    `);
    console.log(`Updated ${res1090.rows.length} rows for Bill #1090 with challan_no and wbs_code.`);

    if (check.rows[0].trip_count === 10 && Number(check.rows[0].total_amount) === 83500) {
      await c.query('COMMIT');
      console.log('SUCCESS: All trips for both Bill #005 & #1090 updated with rate, amount, purpose, challan, and GRN links!');
    } else {
      throw new Error(`Totals mismatch! Expected 10 trips & ₹83,500.00, got ${check.rows[0].trip_count} trips & ₹${check.rows[0].total_amount}`);
    }
  } catch (err) {
    await c.query('ROLLBACK');
    console.error('ERROR during update (rolled back):', err);
    throw err;
  } finally {
    await c.end();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
