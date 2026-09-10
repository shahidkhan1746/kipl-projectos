/**
 * Rewrites legacy /uploads/<key> photo URLs into signed /api/v1/files links.
 *
 * Local uploads used to be served by a public static handler mounted at
 * /uploads. That handler is gone — an unauthenticated directory of every site
 * photo, liaison document and QA record was the thing being fixed — and reads
 * now go through GET /api/v1/files with an HMAC. But the URLs already written
 * into the database still point at the handler that no longer exists, so
 * without this every photo taken before the change 404s the moment the new
 * build is live.
 *
 * Idempotent: a row already carrying /api/v1/files links is left alone, so it
 * is safe to run again, and safe to run before or after `npm run migrate`.
 *
 * Requires a build first (it borrows the signing code rather than restating
 * it, so the two can never drift):
 *
 *   npm run build && npm run migrate:file-urls
 */
const path = require('path')
const { Client } = require('pg')

try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') })
} catch {}

let signFileToken
try {
  ({ signFileToken } = require(path.join(__dirname, '..', 'dist', 'common', 'secret-box.js')))
} catch {
  console.error('dist/common/secret-box.js not found — run `npm run build` first.')
  process.exit(1)
}

const SECRET = process.env.JWT_SECRET
if (!SECRET) {
  console.error('JWT_SECRET must be set: it is what signs the rewritten links.')
  process.exit(1)
}

const BASE = String(process.env.PUBLIC_URL || process.env.API_URL || 'https://kipl-projectos.onrender.com').replace(/\/$/, '')

// Anything ending in /uploads/<key>, whatever host it was written with.
const LEGACY = /^.*\/uploads\/(.+)$/

function resign(url) {
  if (typeof url !== 'string') return null
  const m = url.match(LEGACY)
  if (!m) return null
  const key = decodeURIComponent(m[1].split('?')[0])
  // exp=0: these URLs live in the record, and a QA inspection stores the bare
  // string with no key beside it, so an expiring link there could never be
  // rebuilt. The signature is the authorisation.
  const sig = signFileToken(key, 0, SECRET)
  return `${BASE}/api/v1/files?key=${encodeURIComponent(key)}&exp=0&sig=${sig}`
}

/** Rewrites a photos entry whether it is a bare URL or an object carrying one. */
function rewriteEntry(entry) {
  if (typeof entry === 'string') return resign(entry) ?? entry
  if (entry && typeof entry === 'object' && typeof entry.url === 'string') {
    const next = resign(entry.url)
    return next ? { ...entry, url: next } : entry
  }
  return entry
}

const TARGETS = [
  { table: 'project_updates', column: 'photos' },
  { table: 'site_diaries', column: 'photos' },
  { table: 'qa_inspections', column: 'photos' },
]

async function main() {
  const client = new Client(
    process.env.DATABASE_URL
      ? {
          connectionString: process.env.DATABASE_URL,
          ssl: process.env.DB_SSL === 'false'
            ? false
            : { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' },
        }
      : {
          host: process.env.DB_HOST,
          port: parseInt(process.env.DB_PORT || '5432', 10),
          database: process.env.DB_NAME,
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
          ssl: process.env.DB_SSL === 'false'
            ? false
            : { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' },
        },
  )
  await client.connect()

  let total = 0
  for (const { table, column } of TARGETS) {
    const exists = await client.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
      [table, column],
    )
    if (!exists.rowCount) {
      console.log(`skip ${table}.${column} — not present`)
      continue
    }

    const rows = await client.query(
      `SELECT id, ${column} AS photos FROM ${table} WHERE ${column}::text LIKE '%/uploads/%'`,
    )

    let changed = 0
    for (const row of rows.rows) {
      const before = row.photos
      if (!Array.isArray(before)) continue
      const after = before.map(rewriteEntry)
      if (JSON.stringify(after) === JSON.stringify(before)) continue
      await client.query(`UPDATE ${table} SET ${column} = $1::jsonb WHERE id = $2`, [
        JSON.stringify(after),
        row.id,
      ])
      changed++
    }
    console.log(`${table}.${column}: ${changed} row(s) rewritten of ${rows.rowCount} matched`)
    total += changed
  }

  await client.end()
  console.log(`Done. ${total} row(s) rewritten.`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
