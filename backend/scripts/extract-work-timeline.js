const path = require('path')
const { execSync } = require('child_process')
const { Client } = require('pg')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

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

  // 1. Existing timesheets
  const existingTsRes = await client.query(`SELECT id, employee_id, date, status, work_done_summary, activities FROM timesheets ORDER BY date ASC`)
  const existingTsMap = new Map()
  for (const row of existingTsRes.rows) {
    const dStr = new Date(row.date).toISOString().slice(0, 10)
    existingTsMap.set(dStr, row)
  }

  // 2. Audit logs for admin@kipl.com
  const auditRes = await client.query(`SELECT created_at, method, path, summary, entity_table, entity_id FROM audit_logs WHERE email = 'admin@kipl.com' ORDER BY created_at ASC`)
  const auditByDate = new Map()
  for (const row of auditRes.rows) {
    // Convert to IST (UTC + 5:30)
    const istDate = new Date(new Date(row.created_at).getTime() + (5.5 * 60 * 60 * 1000))
    const dStr = istDate.toISOString().slice(0, 10)
    const timeStr = istDate.toISOString().slice(11, 16)
    if (!auditByDate.has(dStr)) auditByDate.set(dStr, [])
    auditByDate.get(dStr).push({ time: timeStr, summary: row.summary || `${row.method} ${row.path}`, table: row.entity_table })
  }

  // 3. Git log
  const gitLogRaw = execSync('git log --format="COMMIT|%ad|%an|%s|%h" --date=iso', {
    cwd: path.join(__dirname, '..', '..'),
    encoding: 'utf8'
  })

  const gitByDate = new Map()
  for (const line of gitLogRaw.split('\n')) {
    if (!line.startsWith('COMMIT|')) continue
    const parts = line.split('|')
    const isoDateStr = parts[1] // e.g. 2026-09-25 10:17:22 +0530
    const author = parts[2]
    const subject = parts[3]
    const hash = parts[4]

    // Parse date
    const d = new Date(isoDateStr)
    const istDate = new Date(d.getTime() + (5.5 * 60 * 60 * 1000))
    const dStr = isoDateStr.slice(0, 10)
    const timeStr = isoDateStr.slice(11, 16)

    if (!gitByDate.has(dStr)) gitByDate.set(dStr, [])
    gitByDate.get(dStr).push({ time: timeStr, author, subject, hash })
  }

  // Combine all active dates
  const allDates = new Set([...existingTsMap.keys(), ...auditByDate.keys(), ...gitByDate.keys()])
  const sortedDates = [...allDates].sort()

  console.log(`=== FOUND ${sortedDates.length} DATES WITH ACTIVITY ===`)
  
  const report = []
  for (const d of sortedDates) {
    const hasTs = existingTsMap.has(d)
    const gitCommits = gitByDate.get(d) || []
    const auditActions = auditByDate.get(d) || []

    report.push({
      date: d,
      hasTimesheet: hasTs ? 'YES (' + existingTsMap.get(d).status + ')' : 'NO',
      timesheetSummary: hasTs ? existingTsMap.get(d).work_done_summary : '',
      gitCommitCount: gitCommits.length,
      auditActionCount: auditActions.length,
      sampleGit: gitCommits.map(c => `[${c.time}] ${c.subject}`).slice(0, 3).join(' ; '),
    })
  }

  const fs = require('fs')
  fs.writeFileSync(path.join(__dirname, 'work-timeline-analysis.json'), JSON.stringify(report, null, 2))
  console.log('Saved report to backend/scripts/work-timeline-analysis.json (total ' + report.length + ' dates)')

  console.log('--- PART 1: EARLIER DATES ---')
  console.table(report.slice(0, 25).map(r => ({
    date: r.date,
    hasTs: r.hasTimesheet,
    commits: r.gitCommitCount,
    audits: r.auditActionCount,
    git: r.sampleGit.slice(0, 60),
    tsSummary: r.timesheetSummary.slice(0, 40)
  })))

  console.log('--- PART 2: LATER DATES ---')
  console.table(report.slice(25).map(r => ({
    date: r.date,
    hasTs: r.hasTimesheet,
    commits: r.gitCommitCount,
    audits: r.auditActionCount,
    git: r.sampleGit.slice(0, 60),
    tsSummary: r.timesheetSummary.slice(0, 40)
  })))

  await client.end()
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
