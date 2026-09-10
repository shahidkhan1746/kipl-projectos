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

  await c.query(`
    UPDATE projects
    SET name = 'Anantnag',
        code = 'ANG',
        client = NULL,
        contract_value = NULL,
        description = 'Coming Soon',
        location = 'Anantnag, Kashmir',
        status = 'upcoming',
        progress_pct = 0,
        updated_at = NOW()
    WHERE code = 'ANG' OR code = 'ANG-STP-2026' OR name ILIKE '%Anantnag%'
  `);

  const all = await c.query('SELECT id, name, code, status, location FROM projects ORDER BY name ASC');
  console.log('All projects now:', all.rows);

  await c.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
