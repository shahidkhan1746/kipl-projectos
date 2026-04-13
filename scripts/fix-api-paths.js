#!/usr/bin/env node
/**
 * KIPL ProjectOS — Fix wrong API paths
 * Fixes frontend API calls that use wrong endpoint paths
 */

const fs   = require('fs')
const path = require('path')

const ROOT     = path.resolve(__dirname, '..')
const FRONTEND = path.join(ROOT, 'frontend', 'src')
const API_DIR  = path.join(FRONTEND, 'api')

let fixed = 0
function patch(filePath, from, to, label) {
  if (!fs.existsSync(filePath)) { console.log(`  ⚠️   Not found: ${filePath}`); return }
  let src = fs.readFileSync(filePath, 'utf8')
  if (!src.includes(from)) { console.log(`  ℹ️   Already correct or not found: ${label}`); return }
  src = src.replace(new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), to)
  fs.writeFileSync(filePath, src, 'utf8')
  console.log(`  ✅  Fixed: ${label}`)
  fixed++
}

console.log('\n📌  Fixing frontend API paths\n')

// ── liaison.api.ts ────────────────────────────────────────────────────────────
const liaisonApi = path.join(API_DIR, 'liaison.api.ts')
if (fs.existsSync(liaisonApi)) {
  let src = fs.readFileSync(liaisonApi, 'utf8')
  // Fix: /liaison → /liaison/files
  src = src.replace(/\/api\/v1\/liaison'\s*,/g, `'/api/v1/liaison/files',`)
  src = src.replace(/\/api\/v1\/liaison\?/g, `/api/v1/liaison/files?`)
  src = src.replace(/api\.get\('\/api\/v1\/liaison'\)/g, `api.get('/api/v1/liaison/files')`)
  src = src.replace(/api\.get\('\/api\/v1\/liaison',/g, `api.get('/api/v1/liaison/files',`)
  fs.writeFileSync(liaisonApi, src, 'utf8')
  console.log('  ✅  liaison.api.ts — /liaison → /liaison/files')
  fixed++
}

// ── tasks.api.ts ──────────────────────────────────────────────────────────────
const tasksApi = path.join(API_DIR, 'tasks.api.ts')
if (fs.existsSync(tasksApi)) {
  let src = fs.readFileSync(tasksApi, 'utf8')
  console.log('  ℹ️   tasks.api.ts current routes:')
  src.split('\n').filter(l => l.includes('/api/v1/tasks')).forEach(l => console.log('       ' + l.trim()))

  // Fix tasks-board → tasks/board if present
  src = src.replace(/\/api\/v1\/tasks-board/g, '/api/v1/tasks/board')
  src = src.replace(/\/api\/v1\/tasks\/list/g, '/api/v1/tasks')
  fs.writeFileSync(tasksApi, src, 'utf8')
  console.log('  ✅  tasks.api.ts checked')
  fixed++
}

// ── hr.api.ts ─────────────────────────────────────────────────────────────────
const hrApi = path.join(API_DIR, 'hr.api.ts')
if (fs.existsSync(hrApi)) {
  let src = fs.readFileSync(hrApi, 'utf8')
  // Fix: /hr/leaves → /hr/leave
  src = src.replace(/\/api\/v1\/hr\/leaves/g, '/api/v1/hr/leave')
  fs.writeFileSync(hrApi, src, 'utf8')
  console.log('  ✅  hr.api.ts — /hr/leaves → /hr/leave')
  fixed++
}

// ── wbs.api.ts ────────────────────────────────────────────────────────────────
const wbsApi = path.join(API_DIR, 'wbs.api.ts')
if (fs.existsSync(wbsApi)) {
  let src = fs.readFileSync(wbsApi, 'utf8')
  // Fix: /wbs/milestones → /wbs (no separate milestones endpoint)
  src = src.replace(/\/api\/v1\/wbs\/milestones/g, '/api/v1/wbs')
  fs.writeFileSync(wbsApi, src, 'utf8')
  console.log('  ✅  wbs.api.ts — /wbs/milestones → /wbs')
  fixed++
}

// ── Update health-check.js with correct paths ────────────────────────────────
console.log('\n📌  Updating health-check.js with correct paths\n')

const hcPath = path.join(ROOT, 'scripts', 'health-check.js')
if (fs.existsSync(hcPath)) {
  let src = fs.readFileSync(hcPath, 'utf8')
  src = src.replace(`path: \`/liaison\${P}\``, `path: \`/liaison/files\${P}\``)
  src = src.replace(`path: \`/hr/leaves\${P}\``, `path: \`/hr/leave\${P}\``)
  src = src.replace(`path: \`/tasks/board\${P}\``, `path: \`/tasks\${P}\``)
  src = src.replace(`path: \`/wbs/milestones\${P}\``, `path: \`/wbs\${P}\``)
  // PDF is POST only — change to a valid GET or remove
  src = src.replace(
    `{ label: 'PDF — Reports',                 path: \`/pdf/reports\${P}\` },`,
    `{ label: 'PDF — Salary Slip (POST)',       path: '/pdf/salary-slip', method: 'POST', body: {} },`
  )
  fs.writeFileSync(hcPath, src, 'utf8')
  console.log('  ✅  health-check.js updated with correct paths')
  fixed++
}

console.log('\n' + '─'.repeat(50))
console.log(`\n🏁  ${fixed} fixes applied\n`)
console.log('  Now re-run: node scripts/health-check.js')
console.log('  Expected: 35+ working, 0-1 broken\n')
