#!/usr/bin/env node
/**
 * KIPL ProjectOS — Polish Pass 2a
 * 1. Deletes orphaned DashboardLayout.tsx (unused, Tailwind-based, replaced by AppLayout)
 * 2. Audits all page files by line count — flags thin pages (<40 lines) as stubs
 * 3. Checks all pages for Tailwind className usage (violates style={{}} convention)
 */

const fs   = require('fs')
const path = require('path')

const ROOT     = path.resolve(__dirname, '..')
const FRONTEND = path.join(ROOT, 'frontend', 'src')

let passCount = 0
let failCount = 0
let warnCount = 0

function ok(msg)   { console.log(`  ✅  ${msg}`); passCount++ }
function fail(msg) { console.error(`  ❌  ${msg}`); failCount++ }
function warn(msg) { console.log(`  ⚠️   ${msg}`); warnCount++ }
function info(msg) { console.log(`  ℹ️   ${msg}`) }

// ─────────────────────────────────────────────────────────────────────────────
// 1. Delete orphaned DashboardLayout.tsx
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n📌 Step 1 — Delete orphaned DashboardLayout.tsx\n')

const dlPath = path.join(FRONTEND, 'layouts', 'DashboardLayout.tsx')

if (!fs.existsSync(dlPath)) {
  info('DashboardLayout.tsx already gone — skipping')
  passCount++
} else {
  // Safety: confirm nothing imports it
  const allFiles = getAllFiles(FRONTEND, '.tsx').concat(getAllFiles(FRONTEND, '.ts'))
  const importers = allFiles.filter(f => {
    if (f.includes('DashboardLayout.tsx')) return false
    return fs.readFileSync(f, 'utf8').includes('DashboardLayout')
  })

  if (importers.length > 0) {
    fail(`DashboardLayout still imported in:\n    ${importers.map(f => path.relative(ROOT, f)).join('\n    ')}`)
  } else {
    fs.unlinkSync(dlPath)
    ok('Deleted DashboardLayout.tsx (orphaned — AppLayout is the active layout)')
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Page line-count audit — flag thin stubs
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n📌 Step 2 — Page file audit (line count)\n')

const PAGES_DIR = path.join(FRONTEND, 'pages')
const pageFiles = getAllFiles(PAGES_DIR, '.tsx')

const STUB_THRESHOLD   = 50   // under 50 lines = likely a stub
const THIN_THRESHOLD   = 120  // under 120 lines = thin / worth reviewing

const stubs = []
const thin  = []
const solid = []

console.log('  Lines  File')
console.log('  ─────  ' + '─'.repeat(55))

for (const file of pageFiles.sort()) {
  const lines = fs.readFileSync(file, 'utf8').split('\n').length
  const rel   = path.relative(path.join(ROOT, 'frontend', 'src', 'pages'), file)
  const label = lines < 10 ? '🔴' : lines < STUB_THRESHOLD ? '🟠' : lines < THIN_THRESHOLD ? '🟡' : '🟢'
  console.log(`  ${String(lines).padStart(4)}   ${label}  ${rel}`)
  if (lines < STUB_THRESHOLD)   stubs.push({ file: rel, lines })
  else if (lines < THIN_THRESHOLD) thin.push({ file: rel, lines })
  else solid.push({ file: rel, lines })
}

console.log()
if (stubs.length > 0) {
  warn(`${stubs.length} STUB page(s) detected (< ${STUB_THRESHOLD} lines) — likely placeholder content:`)
  stubs.forEach(s => info(`   ${s.lines} lines  →  ${s.file}`))
} else {
  ok('No stub pages found')
}

if (thin.length > 0) {
  warn(`${thin.length} THIN page(s) (${STUB_THRESHOLD}–${THIN_THRESHOLD} lines) — may need content:`)
  thin.forEach(s => info(`   ${s.lines} lines  →  ${s.file}`))
} else {
  ok('No thin pages found')
}

info(`${solid.length} solid pages (${THIN_THRESHOLD}+ lines)`)

// ─────────────────────────────────────────────────────────────────────────────
// 3. Tailwind className audit — flag pages using className (style={{}} rule)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n📌 Step 3 — Tailwind className audit (style={{}} convention check)\n')

const EXCLUDED_CLASSNAMES = ['fade-in', 'sr-only'] // allowed utility classes
const classNameViolators = []

for (const file of pageFiles) {
  const src = fs.readFileSync(file, 'utf8')
  const rel = path.relative(path.join(ROOT, 'frontend', 'src', 'pages'), file)

  // Find className= usages
  const matches = [...src.matchAll(/className=["'{`]([^"'{`]*?)["'}]/g)]
    .map(m => m[1].trim())
    .filter(cls => cls && !EXCLUDED_CLASSNAMES.includes(cls))

  if (matches.length > 0) {
    classNameViolators.push({ file: rel, classes: matches.slice(0, 5) })
  }
}

// Also check layout files
const layoutFiles = getAllFiles(path.join(FRONTEND, 'layouts'), '.tsx')
for (const file of layoutFiles) {
  const src = fs.readFileSync(file, 'utf8')
  const rel = 'layouts/' + path.basename(file)
  const matches = [...src.matchAll(/className=["'{`]([^"'{`]*?)["'}]/g)]
    .map(m => m[1].trim())
    .filter(cls => cls && !EXCLUDED_CLASSNAMES.includes(cls))
  if (matches.length > 0) classNameViolators.push({ file: rel, classes: matches.slice(0, 5) })
}

if (classNameViolators.length === 0) {
  ok('No className violations — all pages use style={{}} correctly')
} else {
  warn(`${classNameViolators.length} file(s) use Tailwind className (should use style={{}})`)
  classNameViolators.forEach(v => {
    info(`   ${v.file}`)
    v.classes.forEach(c => info(`      className="${c}"`))
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Check all pages have default exports
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n📌 Step 4 — Verify all pages have default exports\n')

const noExport = pageFiles.filter(f => {
  const src = fs.readFileSync(f, 'utf8')
  return !src.includes('export default')
})

if (noExport.length === 0) {
  ok('All pages have default exports')
} else {
  noExport.forEach(f => fail(`Missing default export: ${path.relative(ROOT, f)}`))
}

// ─────────────────────────────────────────────────────────────────────────────
// Summary + Recommendations
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(60))
console.log(`\n🏁 Polish Pass 2a Complete`)
console.log(`   ✅ ${passCount} passed  ⚠️  ${warnCount} warnings  ❌ ${failCount} failed\n`)

if (stubs.length > 0) {
  console.log('📋 RECOMMENDED NEXT: Rebuild these stub pages:')
  stubs.forEach(s => console.log(`   → ${s.file} (${s.lines} lines)`))
  console.log()
}

if (thin.length > 0) {
  console.log('📋 OPTIONAL: Review these thin pages for missing features:')
  thin.forEach(s => console.log(`   → ${s.file} (${s.lines} lines)`))
  console.log()
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility
// ─────────────────────────────────────────────────────────────────────────────
function getAllFiles(dir, ext) {
  const results = []
  if (!fs.existsSync(dir)) return results
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) results.push(...getAllFiles(full, ext))
    else if (entry.name.endsWith(ext)) results.push(full)
  }
  return results
}
