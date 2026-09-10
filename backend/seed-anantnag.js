const { Client } = require('pg');
require('dotenv').config();

async function main() {
  const c = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
  });

  await c.connect();
  console.log('Connected to DB');

  // Add 'upcoming' to enum if it exists
  try {
    await c.query("ALTER TYPE projects_status_enum ADD VALUE IF NOT EXISTS 'upcoming'");
    console.log("Added 'upcoming' to projects_status_enum");
  } catch (e) {
    console.log('Enum update note:', e.message);
  }

  // Check if Anantnag project already exists
  const check = await c.query("SELECT id, name, code, status FROM projects WHERE code = 'ANG-STP-2026' OR name ILIKE '%Anantnag%'");
  if (check.rows.length > 0) {
    console.log('Anantnag project already exists:', check.rows[0]);
  } else {
    const insertRes = await c.query(`
      INSERT INTO projects (
        id,
        name,
        code,
        description,
        client,
        location,
        contract_value,
        status,
        progress_pct,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        'Anantnag Sewerage & STP Scheme',
        'ANG-STP-2026',
        'Comprehensive Sewerage Network & Sewage Treatment Plant (STP) Scheme for Anantnag Town, South Kashmir. Upcoming project in bidding/allotment phase.',
        'J&K UEED / Jal Shakti Department',
        'Anantnag, Kashmir, J&K',
        18500000000,
        'upcoming',
        0,
        NOW(),
        NOW()
      ) RETURNING id, name, code, status
    `);
    console.log('Created Anantnag project:', insertRes.rows[0]);
  }

  const all = await c.query('SELECT id, name, code, status, location FROM projects ORDER BY name ASC');
  console.log('All projects now:', all.rows);

  await c.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
