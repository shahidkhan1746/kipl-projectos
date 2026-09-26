const path = require('path')
const { execSync } = require('child_process')
const { Client } = require('pg')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

// Employee ID for Shahid Khan (KIPL-ADM-1339)
const EMPLOYEE_ID = 'd269cb39-5464-49e9-af60-e0b6fa743813'
const USER_ID = 'b2e0a12f-7828-46db-95a2-685cb71c6350'
const PROJECT_ID = '4a5176c7-0f53-42cc-bbd8-1a7259648a96'

async function main() {
  const ssl = { rejectUnauthorized: false }
  const client = new Client({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl,
  })
  await client.connect()

  // 1. Fetch git commit log grouped by date
  const gitLogRaw = execSync('git log --format="COMMIT|%ad|%an|%s|%h" --date=iso', {
    cwd: path.join(__dirname, '..', '..'),
    encoding: 'utf8'
  })

  const commitsByDate = new Map()
  for (const line of gitLogRaw.split('\n')) {
    if (!line.startsWith('COMMIT|')) continue
    const [, dateStr, author, subject, hash] = line.split('|')
    const dStr = dateStr.slice(0, 10)
    const timeStr = dateStr.slice(11, 16)
    if (!commitsByDate.has(dStr)) commitsByDate.set(dStr, [])
    commitsByDate.get(dStr).push({ time: timeStr, author, subject, hash })
  }

  // 2. Fetch audit logs grouped by date
  const auditRes = await client.query(`SELECT created_at, method, path, summary FROM audit_logs WHERE email = 'admin@kipl.com' ORDER BY created_at ASC`)
  const auditByDate = new Map()
  for (const row of auditRes.rows) {
    const istDate = new Date(new Date(row.created_at).getTime() + (5.5 * 60 * 60 * 1000))
    const dStr = istDate.toISOString().slice(0, 10)
    const timeStr = istDate.toISOString().slice(11, 16)
    if (!auditByDate.has(dStr)) auditByDate.set(dStr, [])
    auditByDate.get(dStr).push({ time: timeStr, summary: row.summary || `${row.method} ${row.path}` })
  }

  // 3. Existing timesheets
  const existingRes = await client.query(`SELECT id, employee_id, date, status, work_done_summary FROM timesheets`)
  const existingDates = new Set()
  for (const r of existingRes.rows) {
    const dStr = new Date(r.date).toISOString().slice(0, 10)
    existingDates.add(dStr)
  }

  console.log(`Existing timesheets count: ${existingRes.rows.length}`)
  console.log(`Existing timesheet dates:`, [...existingDates].sort())

  // Fix existing rows where employee_id was set to user_id
  const fixRes = await client.query(`UPDATE timesheets SET employee_id = $1 WHERE employee_id = $2`, [EMPLOYEE_ID, USER_ID])
  console.log(`Updated ${fixRes.rowCount} legacy timesheets with user_id to proper employee_id (${EMPLOYEE_ID})`)

  await client.end()
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
