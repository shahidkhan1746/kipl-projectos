#!/usr/bin/env node
/**
 * KIPL ProjectOS — Full Endpoint Health Check
 * Tests every API route and reports status
 * Run from: ~/Desktop/kipl-srinagar/
 */

const http = require('http')

const BASE       = 'http://localhost:3000/api/v1'
const PROJECT_ID = '4a5176c7-0f53-42cc-bbd8-1a7259648a96'

// First login to get a real token
async function getToken() {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ email: 'admin@kipl.in', password: 'password' })
    const req = http.request({
      hostname: 'localhost', port: 3000,
      path: '/api/v1/auth/login', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, res => {
      let data = ''
      res.on('data', d => data += d)
      res.on('end', () => {
        try {
          const json = JSON.parse(data)
          if (json.access_token) resolve(json.access_token)
          else reject('No token in response: ' + data)
        } catch(e) { reject('Parse error: ' + data) }
      })
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

function request(token, path, method = 'GET', body = null) {
  return new Promise((resolve) => {
    const bodyStr = body ? JSON.stringify(body) : null
    const headers = {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json',
    }
    if (bodyStr) headers['Content-Length'] = Buffer.byteLength(bodyStr)

    const req = http.request({
      hostname: 'localhost', port: 3000,
      path: BASE.replace('http://localhost:3000', '') + path,
      method, headers,
    }, res => {
      let data = ''
      res.on('data', d => data += d)
      res.on('end', () => resolve({ status: res.statusCode, data: data.slice(0, 100) }))
    })
    req.on('error', e => resolve({ status: 'ERR', data: e.message }))
    req.setTimeout(5000, () => { req.destroy(); resolve({ status: 'TIMEOUT', data: '' }) })
    if (bodyStr) req.write(bodyStr)
    req.end()
  })
}

const P = `?projectId=${PROJECT_ID}`

const ENDPOINTS = [
  // Auth
  { label: 'Auth — Login',                  path: '/auth/login',              method: 'POST', body: { email: 'admin@kipl.in', password: 'password' } },

  // Dashboard / Projects
  { label: 'Projects — List',               path: '/projects' },
  { label: 'Projects — Active',             path: `/projects/${PROJECT_ID}` },

  // Liaison
  { label: 'Liaison — Files',               path: `/liaison/files${P}` },
  { label: 'Liaison — Dashboard',           path: `/liaison/dashboard${P}` },
  { label: 'Liaison — Letters',             path: `/liaison/letters${P}` },

  // HR
  { label: 'HR — Employees',                path: `/hr/employees${P}` },
  { label: 'HR — Dashboard',                path: `/hr/dashboard` },
  { label: 'HR — Attendance',               path: `/hr/attendance${P}` },
  { label: 'HR — Timesheets',               path: `/hr/timesheets${P}` },
  { label: 'HR — Salary',                   path: `/hr/salary${P}` },
  { label: 'HR — Leave Requests',           path: `/hr/leave${P}` },

  // Tasks
  { label: 'Tasks — List',                  path: `/tasks-board${P}` },
  { label: 'Tasks — Board',                 path: `/tasks-board/dashboard${P}` },

  // EPC / BOQ
  { label: 'EPC — BOQ Items',               path: `/epc/boq${P}` },
  { label: 'EPC — Measurements',            path: `/epc/measurements${P}` },
  { label: 'EPC — RA Bills',                path: `/epc/ra-bills${P}` },

  // Accounting
  { label: 'Accounting — Dashboard',        path: `/accounting/dashboard${P}` },
  { label: 'Accounting — Expenses',         path: `/accounting/expenses${P}` },
  { label: 'Accounting — Transactions',     path: `/accounting/transactions${P}` },
  { label: 'Accounting — Vendors',          path: `/accounting/vendors${P}` },
  { label: 'Accounting — TDS',              path: `/accounting/tds${P}` },
  { label: 'Accounting — Invoices',         path: `/accounting/invoices${P}` },

  // QA
  { label: 'QA — Inspections',              path: `/qa/inspections${P}` },
  { label: 'QA — Checklists',               path: `/qa/checklists${P}` },
  { label: 'QA — NCRs',                     path: `/qa/ncrs${P}` },
  { label: 'QA — Dashboard',                path: `/qa/dashboard${P}` },

  // Site Diary
  { label: 'Diary — List',                  path: `/diary${P}` },
  { label: 'Diary — Dashboard',             path: `/diary/dashboard${P}` },

  // Meetings
  { label: 'Meetings — List',               path: `/meetings${P}` },
  { label: 'Meetings — Dashboard',          path: `/meetings/dashboard` },

  // WBS
  { label: 'WBS — Tasks',                   path: `/wbs${P}` },
  { label: 'WBS — Milestones',              path: `/wbs${P}` },

  // Settings
  { label: 'Settings — All',                path: `/settings` },
  { label: 'Settings — Weather Key',        path: `/settings/key?key=weather_api_key` },

  // Reports / PDF
  { label: 'PDF — Salary Slip (POST)',       path: '/pdf/salary-slip', method: 'POST', body: {} },

  // Users
  { label: 'Users — List',                  path: `/users` },
]

async function run() {
  console.log('\n🔍  KIPL ProjectOS — Endpoint Health Check\n')
  console.log('  Logging in...')

  let token
  try {
    token = await getToken()
    console.log('  ✅  Login successful\n')
  } catch(e) {
    // Try to find the right email
    console.log('  ⚠️   Login failed with admin@kipl.in — trying to find super_admin email...')
    console.log('  Run: PGPASSWORD=PePH6FaCgFYgwEkb4xDy psql -h localhost -U kipl_user -d kipl_projectos -c "SELECT email FROM users WHERE role=\'super_admin\' LIMIT 1;"')
    console.log('  Then update the email in this script and re-run.\n')
    process.exit(1)
  }

  const results = { ok: [], warn: [], fail: [] }

  console.log(`  ${'Status'.padEnd(8)} ${'Endpoint'.padEnd(40)}`)
  console.log('  ' + '─'.repeat(60))

  for (const ep of ENDPOINTS) {
    const { status } = await request(token, ep.path, ep.method || 'GET', ep.body || null)

    let icon, bucket
    if (status === 200 || status === 201)      { icon = '✅ '; bucket = 'ok' }
    else if (status === 404)                    { icon = '❌ '; bucket = 'fail' }
    else if (status === 401 || status === 403)  { icon = '🔒 '; bucket = 'warn' }
    else if (status === 500)                    { icon = '💥 '; bucket = 'fail' }
    else if (status === 'TIMEOUT')              { icon = '⏱️  '; bucket = 'warn' }
    else if (status === 'ERR')                  { icon = '🔌 '; bucket = 'fail' }
    else                                        { icon = `${status} `; bucket = 'warn' }

    results[bucket].push({ label: ep.label, status, path: ep.path })
    console.log(`  ${icon} ${String(status).padEnd(6)} ${ep.label}`)
  }

  // Summary
  console.log('\n' + '═'.repeat(62))
  console.log(`\n  ✅  ${results.ok.length} working`)
  console.log(`  ⚠️   ${results.warn.length} warnings (auth/timeout)`)
  console.log(`  ❌  ${results.fail.length} broken (404/500/ERR)\n`)

  if (results.fail.length > 0) {
    console.log('  BROKEN ENDPOINTS — need fixing before deploy:')
    results.fail.forEach(r => console.log(`    ❌  ${r.label.padEnd(35)} ${r.path}`))
    console.log()
  }

  if (results.warn.length > 0) {
    console.log('  WARNINGS:')
    results.warn.forEach(r => console.log(`    ⚠️   ${r.label.padEnd(35)} [${r.status}] ${r.path}`))
    console.log()
  }
}

run().catch(e => {
  console.error('Fatal:', e)
  process.exit(1)
})
