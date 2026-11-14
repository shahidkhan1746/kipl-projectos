/**
 * Loads the site's opening inventory into the asset register (office_assets).
 *
 *   node scripts/seed-office-assets.js            # dry run: prints what it would add
 *   node scripts/seed-office-assets.js --apply    # writes it
 *
 * Options: --project <project id>   (default: Dal Lake Sewerage Scheme)
 *          --actor-email <email>    who the history records as registering them
 *                                   (default: the earliest active super admin)
 *
 * Connects with DATABASE_URL or DB_* from backend/.env, like run-migrations.js.
 *
 * Each item has a fixed id, so running it again adds nothing twice and never
 * touches a record staff have since edited, transferred or disposed of. Tags
 * are allocated exactly as AssetsService.create does: under the same advisory
 * lock, continuing from the highest KIPL-AST number in the register. Each new
 * record gets the same 'created' history event the app writes.
 *
 * Only what is known is filled in. Serial and registration numbers, purchase
 * details and assignments are left blank for the site to complete in the app.
 */
const path = require('path')
const { Client } = require('pg')

try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') })
} catch {}

const DEFAULT_PROJECT_ID = '4a5176c7-0f53-42cc-bbd8-1a7259648a96' // Dal Lake Sewerage Scheme

// Where things are kept. Edit before applying if these are wrong: once a record
// exists, the app only changes its location through a transfer.
const SITE = 'Nishat STP site'
const OFFICE = 'Site office, Nishat'

const ITEMS = [
  // Site cabins
  { id: '0f5a1c2e-3b41-4d6a-9a10-5e0c6a1d0001', name: 'Porta cabin', category: 'other', location: SITE, condition: 'fair',
    notes: 'Relocated from another KIPL site.' },
  { id: '0f5a1c2e-3b41-4d6a-9a10-5e0c6a1d0002', name: 'Porta cabin', category: 'other', location: SITE, condition: 'new',
    notes: 'New, bought for the Nishat site.' },
  { id: '0f5a1c2e-3b41-4d6a-9a10-5e0c6a1d0003', name: 'Porta cabin', category: 'other', location: SITE, condition: 'fair',
    notes: 'Legacy asset carried over from an earlier KIPL project.' },

  // Vehicles
  { id: '0f5a1c2e-3b41-4d6a-9a10-5e0c6a1d0004', name: 'Maruti Suzuki Brezza', category: 'vehicle', location: SITE, condition: 'good',
    brand: 'Maruti Suzuki', model: 'Brezza' },
  { id: '0f5a1c2e-3b41-4d6a-9a10-5e0c6a1d0005', name: 'Maruti Suzuki Wagon R', category: 'vehicle', location: SITE, condition: 'good',
    brand: 'Maruti Suzuki', model: 'Wagon R' },
  { id: '0f5a1c2e-3b41-4d6a-9a10-5e0c6a1d0006', name: 'Bajaj Chetak electric scooter', category: 'vehicle', location: SITE, condition: 'good',
    brand: 'Bajaj', model: 'Chetak Premium' },

  // Plant. Filed as vehicles: the register has no plant category, and this
  // gives them the registration, insurance and chassis fields they need.
  { id: '0f5a1c2e-3b41-4d6a-9a10-5e0c6a1d0007', name: 'Komatsu PC210 excavator', category: 'vehicle', location: SITE, condition: 'good',
    brand: 'Komatsu', model: 'PC210-10M0',
    notes: '20-tonne crawler excavator ("Poclain" on site). Recorded as the PC210-10M0, the India-built model since 2019; check the machine plate (the long-track version is the PC210LC-10M0).' },
  { id: '0f5a1c2e-3b41-4d6a-9a10-5e0c6a1d0008', name: 'JCB 3DX backhoe loader', category: 'vehicle', location: SITE, condition: 'good',
    brand: 'JCB', model: '3DX',
    notes: 'Backhoe loader. Check the variant on the machine plate: 3DX, 3DX Plus or 3DX Super.' },

  // IT
  { id: '0f5a1c2e-3b41-4d6a-9a10-5e0c6a1d0009', name: 'Laptop', category: 'laptop', location: OFFICE, condition: 'good' },
  { id: '0f5a1c2e-3b41-4d6a-9a10-5e0c6a1d0010', name: 'Laptop', category: 'laptop', location: OFFICE, condition: 'good' },
  { id: '0f5a1c2e-3b41-4d6a-9a10-5e0c6a1d0011', name: 'Laptop', category: 'laptop', location: OFFICE, condition: 'good' },
  { id: '0f5a1c2e-3b41-4d6a-9a10-5e0c6a1d0012', name: 'Desktop computer with monitor', category: 'computer', location: OFFICE, condition: 'good' },
  { id: '0f5a1c2e-3b41-4d6a-9a10-5e0c6a1d0013', name: 'Desktop computer with monitor', category: 'computer', location: OFFICE, condition: 'good' },

  // Office equipment
  { id: '0f5a1c2e-3b41-4d6a-9a10-5e0c6a1d0014', name: 'Water dispenser', category: 'office_equipment', location: OFFICE, condition: 'good' },
]

const COLUMNS = ['id', 'project_id', 'asset_tag', 'name', 'category', 'location', 'status', 'condition', 'brand', 'model', 'notes', 'version']

function arg(name) {
  const i = process.argv.indexOf(name)
  return i > -1 ? process.argv[i + 1] : undefined
}

// The same TLS rule as run-migrations.js and src/common/database-ssl.ts.
function ssl() {
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
}

/** The row as the app's entity serialises it, for the history event. */
function asEntity(row) {
  return Object.fromEntries(Object.entries(row).map(([k, v]) => [k.replace(/_([a-z])/g, (_, c) => c.toUpperCase()), v]))
}

async function main() {
  const apply = process.argv.includes('--apply')
  const projectId = arg('--project') || DEFAULT_PROJECT_ID
  const actorEmail = arg('--actor-email')

  const client = new Client(process.env.DATABASE_URL ? { connectionString: process.env.DATABASE_URL, ssl: ssl() } : {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: ssl(),
  })
  await client.connect()
  try {
    const { rows: [project] } = await client.query('SELECT id, name FROM projects WHERE id = $1', [projectId])
    if (!project) throw new Error(`No project with id ${projectId}. Pass --project <id>.`)

    const { rows: [actor] } = actorEmail
      ? await client.query('SELECT id, name FROM users WHERE lower(email) = lower($1)', [actorEmail])
      : await client.query("SELECT id, name FROM users WHERE role::text = 'super_admin' AND is_active ORDER BY created_at LIMIT 1")
    if (!actor) throw new Error(actorEmail ? `No user with email ${actorEmail}.` : 'No active super admin found. Pass --actor-email <email>.')

    const { rows: existing } = await client.query('SELECT id FROM office_assets WHERE id = ANY($1::uuid[])', [ITEMS.map(i => i.id)])
    const have = new Set(existing.map(r => r.id))
    const todo = ITEMS.filter(i => !have.has(i.id))

    console.log(`Project: ${project.name} (${project.id})`)
    console.log(`Recorded as registered by: ${actor.name}`)
    console.log(`${ITEMS.length} items in the seed, ${have.size} already in the register, ${todo.length} to add.\n`)
    for (const i of todo) console.log(`  + ${i.name.padEnd(32)} ${i.category.padEnd(17)} ${i.condition.padEnd(5)} ${i.location}`)

    if (!todo.length) return
    if (!apply) {
      console.log('\nDry run: nothing written. Run again with --apply to add these.')
      return
    }

    await client.query('BEGIN')
    try {
      // Same lock and counter as AssetsService.create, so tags never collide
      // with ones the app hands out at the same moment.
      await client.query('SELECT pg_advisory_xact_lock($1, $2)', [74191, 1])
      const { rows: [counter] } = await client.query(
        "SELECT COALESCE(MAX(SUBSTRING(asset_tag FROM 10)::numeric), 0)::text AS maximum FROM office_assets WHERE asset_tag ~ '^KIPL-AST-[0-9]+$'")
      let next = BigInt(counter.maximum)
      const today = new Date().toISOString().slice(0, 10)
      console.log('')
      for (const i of todo) {
        next += 1n
        const tag = `KIPL-AST-${next.toString().padStart(6, '0')}`
        const values = [i.id, project.id, tag, i.name, i.category, i.location, 'available', i.condition, i.brand ?? null, i.model ?? null, i.notes ?? null, 1]
        const { rows: [row] } = await client.query(
          `INSERT INTO office_assets (${COLUMNS.join(', ')}) VALUES (${COLUMNS.map((_, n) => `$${n + 1}`).join(', ')})
           ON CONFLICT (id) DO NOTHING RETURNING *`, values)
        if (!row) { next -= 1n; continue }
        await client.query(
          `INSERT INTO office_asset_events (asset_id, project_id, action, event_date, reason, actor_id, actor_name, "before", "after")
           VALUES ($1, $2, 'created', $3, $4, $5, $6, NULL, $7)`,
          [row.id, project.id, today, 'Asset registered (opening inventory)', actor.id, actor.name || 'User', JSON.stringify(asEntity(row))])
        console.log(`  ${tag}  ${i.name}`)
      }
      await client.query('COMMIT')
      console.log('\nDone.')
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    }
  } finally {
    await client.end()
  }
}

main().catch(err => {
  console.error(err.message)
  process.exit(1)
})
