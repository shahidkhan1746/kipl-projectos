/**
 * Applies backend/migrations/*.sql in filename order against DATABASE_URL
 * or DB_* env vars. Safe to re-run: statements use IF NOT EXISTS.
 */
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') })
} catch {}

async function main() {
  const dir = path.join(__dirname, '..', 'migrations')
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort()
  // The same rule the application uses — see src/common/database-ssl.ts. It
  // defaulted to verifying here while the app defaulted to not, so this script
  // failed with SELF_SIGNED_CERT_IN_CHAIN against a managed Postgres whose CA
  // is not in Node's trust store. The one command that fixes a schema drift
  // could not run.
  const ssl = (() => {
    if (process.env.DB_SSL === 'false' || process.env.DB_HOST === 'localhost') return false
    const raw = (process.env.DB_SSL_CA || '').trim()
    const ca = raw.includes('BEGIN CERTIFICATE')
      ? raw
      : raw && Buffer.from(raw, 'base64').toString('utf8').includes('BEGIN CERTIFICATE')
        ? Buffer.from(raw, 'base64').toString('utf8')
        : undefined
    if (ca) return { ca, rejectUnauthorized: true }
    if (process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true') return { rejectUnauthorized: true }
    console.warn('[WARN] Database TLS is encrypted but UNVERIFIED. Set DB_SSL_CA to verify it.')
    return { rejectUnauthorized: false }
  })()
  const client = new Client(process.env.DATABASE_URL ? { connectionString: process.env.DATABASE_URL, ssl } : {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl,
  })
  await client.connect()
  try {
    await client.query("ALTER TYPE projects_status_enum ADD VALUE IF NOT EXISTS 'upcoming'")
  } catch {}
  for (const file of files) {
    const sql = fs.readFileSync(path.join(dir, file), 'utf8')
    console.log('Applying', file)
    try {
      await client.query(sql)
    } catch (err) {
      if (err.code === '0A000' && err.message.includes('extension "vector"')) {
        console.warn(`[WARN] Skipping ${file}: pgvector extension not available on this database host.`)
      } else if (err.code === '42P01') {
        console.warn(`[WARN] Skipping ${file}: relation does not exist yet (${err.message}).`)
      } else {
        throw err
      }
    }
  }
  await client.end()
  console.log('Migrations complete.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
