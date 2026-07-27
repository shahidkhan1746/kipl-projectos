const fs = require('fs')
const { Client } = require('pg')

const env = {}
for (const line of fs.readFileSync(__dirname + '/.env', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m) env[m[1]] = m[2].trim()
}

const ID   = '4a5176c7-0f53-42cc-bbd8-1a7259648a96'
const NAME = 'Dal Lake Sewerage Scheme'
const CODE = 'DAL-STP-2025'

;(async () => {
  const c = new Client({
    host: env.DB_HOST, port: parseInt(env.DB_PORT), database: env.DB_NAME,
    user: env.DB_USER, password: env.DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
  })
  await c.connect()
  const now = new Date()
  await c.query(
    `INSERT INTO projects (id, name, code, description, client, location,
       contract_value, start_date, end_date, status, progress_pct, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'active',0,$10,$10)
     ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, contract_value = EXCLUDED.contract_value`,
    [ID, NAME, CODE,
     'Survey, Design & Execution of Sewerage Scheme for Dal Lake Uncovered Areas — EPC Fixed-Cost Turnkey. Allotment CE/UEED/PS/01 OF 2025-26 dated 07-11-2025.',
     'J&K UEED Srinagar', 'Srinagar, J&K',
     2799900000, '2025-11-07', '2028-05-07', now]
  )
  console.log('Project ready:', NAME, ID)
  await c.end()
})().catch(e => { console.error('FAILED:', e.message); process.exit(1) })
