// Run from project root: node scripts/seed-gowhar.js
const path = require('path')
const pg       = require(path.join('backend', 'node_modules', 'pg'))
const bcryptjs = require(path.join('backend', 'node_modules', 'bcryptjs'))
const { Client } = pg

async function seed() {
  const client = new Client({
    host:     'localhost',
    port:     5432,
    database: 'kipl_projectos',
    user:     'kipl_user',
    password: 'PePH6FaCgFYgwEkb4xDy',
  })
  await client.connect()
  console.log('Connected...')

  const hash = await bcryptjs.hash('PM@KIPL#2024', 10)

  const res = await client.query(
    `INSERT INTO users (id, name, email, password_hash, role, department, designation, is_active, created_at, updated_at)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, true, NOW(), NOW())
     ON CONFLICT (email) DO UPDATE SET
       name = $1, password_hash = $3, role = $4, department = $5, designation = $6
     RETURNING email, role`,
    ['Gowhar Shah', 'gowhar@kipl.in', hash, 'project_manager', 'Management', 'Project Manager']
  )

  console.log('Done:', res.rows[0])
  await client.end()
}

seed().catch(e => { console.error('Error:', e.message); process.exit(1) })
