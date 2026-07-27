require('dotenv').config({ path: __dirname + '/../backend/.env' })
const { Client } = require('pg')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')

const NAME     = 'Shahid Parvez Khan'
const EMAIL    = 'admin@kipl.com'
const PASSWORD = 'vpcea46fg'
const ROLE     = 'super_admin'

;(async () => {
  const c = new Client({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
  })
  await c.connect()
  const hash = await bcrypt.hash(PASSWORD, 12)
  const now = new Date()
  await c.query(
    `INSERT INTO users (id, name, email, password_hash, role, is_active, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,true,$6,$6)
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role`,
    [crypto.randomUUID(), NAME, EMAIL, hash, ROLE, now]
  )
  console.log('Admin ready:', EMAIL)
  await c.end()
})().catch(e => { console.error('FAILED:', e.message); process.exit(1) })
