/**
 * Applies backend/migrations/*.sql in filename order against DATABASE_URL
 * or DB_* env vars. Safe to re-run: statements use IF NOT EXISTS.
 */
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

async function main() {
  const dir = path.join(__dirname, '..', 'migrations')
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort()
  const client = new Client(process.env.DATABASE_URL ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } } : {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' },
  })
  await client.connect()
  for (const file of files) {
    const sql = fs.readFileSync(path.join(dir, file), 'utf8')
    console.log('Applying', file)
    await client.query(sql)
  }
  await client.end()
  console.log('Migrations complete.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
