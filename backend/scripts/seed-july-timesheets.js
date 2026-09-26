const path = require('path')
const { Client } = require('pg')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const EMPLOYEE_ID = 'd269cb39-5464-49e9-af60-e0b6fa743813' // Shahid Khan (KIPL-ADM-1339)
const USER_ID = 'b2e0a12f-7828-46db-95a2-685cb71c6350'
const PROJECT_ID = '4a5176c7-0f53-42cc-bbd8-1a7259648a96' // Dal Lake Sewerage Scheme

const JULY_ACTIVITIES = [
  { day: 1, activity: 'Requirement gathering and planning for KIPL ERP O&M Module.' },
  { day: 2, activity: 'Development of O&M Module – master data and workflow.' },
  { day: 3, activity: 'Development of O&M Module – preventive maintenance features.' },
  { day: 4, activity: 'Bug fixing and testing of Site Diary Module.' },
  { day: 5, activity: 'Sunday', isSunday: true },
  { day: 6, activity: 'Resolved Site Diary Module' },
  { day: 7, activity: 'Development of Timesheet Module.' },
  { day: 8, activity: 'Timesheet Module UI' },
  { day: 9, activity: 'Testing ERP modules and fixing issues.' },
  { day: 10, activity: 'O&M Module – asset management features.' },
  { day: 11, activity: 'Code review and debugging.' },
  { day: 12, activity: 'Sunday', isSunday: true },
  { day: 13, activity: 'Resolved reported ERP issues.' },
  { day: 14, activity: 'Enhanced Site Diary Module and reports.' },
  { day: 15, activity: 'O&M Module – work order management.' },
  { day: 16, activity: 'Integration testing of O&M' },
  { day: 17, activity: 'Bug fixing and optimization.' },
  { day: 18, activity: 'Technical documentation.' },
  { day: 19, activity: 'Sunday', isSunday: true },
  { day: 20, activity: 'Timesheet approval workflow.' },
  { day: 21, activity: 'Database optimization.' },
  { day: 22, activity: 'O&M dashboard enhancements.' },
  { day: 23, activity: 'Regression testing and Site Diary fixes.' },
  { day: 24, activity: 'User support and ERP maintenance.' },
  { day: 25, activity: 'Deployment build testing.' },
  { day: 26, activity: 'Sunday', isSunday: true },
  { day: 27, activity: 'Final O&M improvements.' },
  { day: 28, activity: 'ERP maintenance and bug fixes.' },
  { day: 29, activity: 'Timesheet reporting enhancements.' },
  { day: 30, activity: 'End-to-end module testing.' },
  { day: 31, activity: 'Monthly review and documentation.' },
]

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

  console.log('Seeding official July 2026 Monthly Timesheet for Shahid Khan...')

  for (const item of JULY_ACTIVITIES) {
    const dayStr = String(item.day).padStart(2, '0')
    const dateStr = `2026-07-${dayStr}`

    const activities = item.isSunday ? [
      { time: '—', activity: 'Sunday', location: '—', category: 'Other' }
    ] : [
      { time: '09:30', activity: item.activity, location: 'Head Office', category: 'Administrative Work' },
      { time: '14:30', activity: `${item.activity} - Review, testing & documentation`, location: 'Head Office', category: 'Report Preparation' }
    ]

    const attendanceStatus = item.isSunday ? 'holiday' : 'present'

    const existing = await client.query(
      `SELECT id FROM timesheets WHERE employee_id = $1 AND date = $2`,
      [EMPLOYEE_ID, dateStr]
    )

    if (existing.rows.length > 0) {
      await client.query(
        `UPDATE timesheets 
         SET activities = $1, 
             work_done_summary = $2, 
             attendance_status = $3,
             status = 'approved',
             approved_by = $4,
             approved_at = NOW(),
             project_id = $5,
             updated_at = NOW()
         WHERE id = $6`,
        [
          JSON.stringify(activities),
          item.activity,
          attendanceStatus,
          USER_ID,
          PROJECT_ID,
          existing.rows[0].id
        ]
      )
      console.log(`✓ Updated [${dateStr}]: ${item.activity}`)
    } else {
      await client.query(
        `INSERT INTO timesheets 
         (employee_id, project_id, date, activities, attendance_status, work_done_summary, status, approved_by, approved_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'approved', $7, NOW(), NOW(), NOW())`,
        [
          EMPLOYEE_ID,
          PROJECT_ID,
          dateStr,
          JSON.stringify(activities),
          attendanceStatus,
          item.activity,
          USER_ID
        ]
      )
      console.log(`+ Inserted [${dateStr}]: ${item.activity}`)
    }
  }

  const res = await client.query(
    `SELECT COUNT(*) FROM timesheets WHERE employee_id = $1 AND date >= '2026-07-01' AND date <= '2026-07-31'`,
    [EMPLOYEE_ID]
  )
  console.log(`\nJuly 2026 Timesheets in DB: ${res.rows[0].count} / 31 days`)

  await client.end()
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
