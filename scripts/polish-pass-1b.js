#!/usr/bin/env node
/**
 * KIPL ProjectOS — Polish Pass 1b
 * Fixes DashboardLayout.tsx: swap wrong ui/Sidebar import → layout/Sidebar
 * Then deletes the orphaned components/ui/Sidebar.tsx
 */

const fs   = require('fs')
const path = require('path')

const ROOT     = path.resolve(__dirname, '..')
const FRONTEND = path.join(ROOT, 'frontend', 'src')

let passCount = 0
let failCount = 0

function ok(msg)   { console.log(`  ✅  ${msg}`); passCount++ }
function fail(msg) { console.error(`  ❌  ${msg}`); failCount++ }
function info(msg) { console.log(`  ℹ️   ${msg}`) }

// ─────────────────────────────────────────────────────────────────────────────
// 1. Fix DashboardLayout.tsx — swap wrong Sidebar import
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n📌 Fix 1 — Patch DashboardLayout.tsx import\n')

const dlPath = path.join(FRONTEND, 'layouts', 'DashboardLayout.tsx')

if (!fs.existsSync(dlPath)) {
  fail('DashboardLayout.tsx not found')
} else {
  let src = fs.readFileSync(dlPath, 'utf8')

  const wrongPatterns = [
    `from '@/components/ui/Sidebar'`,
    `from "../components/ui/Sidebar"`,
    `from "./components/ui/Sidebar"`,
    `from '../../components/ui/Sidebar'`,
    `from "../ui/Sidebar"`,
    `from '@/components/ui/Sidebar.tsx'`,
  ]

  let fixed = false
  for (const wrong of wrongPatterns) {
    if (src.includes(wrong)) {
      src = src.replace(wrong, `from '@/components/layout/Sidebar'`)
      fixed = true
      break
    }
  }

  if (!fixed) {
    // Try a regex approach for any variation
    const regex = /from\s+['"]([^'"]*ui\/Sidebar[^'"]*)['"]/g
    if (regex.test(src)) {
      src = src.replace(
        /from\s+['"]([^'"]*ui\/Sidebar[^'"]*)['"]/g,
        `from '@/components/layout/Sidebar'`
      )
      fixed = true
    }
  }

  if (!fixed) {
    fail('Could not find ui/Sidebar import pattern in DashboardLayout.tsx')
    info('Current Sidebar import in DashboardLayout.tsx:')
    const lines = src.split('\n').filter(l => l.includes('Sidebar'))
    lines.forEach(l => info('  ' + l.trim()))
  } else {
    fs.writeFileSync(dlPath, src, 'utf8')
    ok('DashboardLayout.tsx now imports from @/components/layout/Sidebar')
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Verify nothing else imports ui/Sidebar
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n📌 Fix 2 — Verify no remaining imports of ui/Sidebar\n')

const allTsx = getAllFiles(FRONTEND, '.tsx').concat(getAllFiles(FRONTEND, '.ts'))
const uiSidebarPath = path.join(FRONTEND, 'components', 'ui', 'Sidebar.tsx')

const remainingImporters = allTsx.filter(f => {
  if (f === uiSidebarPath) return false
  const content = fs.readFileSync(f, 'utf8')
  return content.match(/ui\/Sidebar/)
})

if (remainingImporters.length > 0) {
  fail(`Still imported in:\n    ${remainingImporters.map(f => path.relative(ROOT, f)).join('\n    ')}`)
} else {
  ok('No other files import ui/Sidebar — safe to delete')

  // ── 3. Delete it ──
  console.log('\n📌 Fix 3 — Delete components/ui/Sidebar.tsx\n')
  if (fs.existsSync(uiSidebarPath)) {
    fs.unlinkSync(uiSidebarPath)
    ok('Deleted components/ui/Sidebar.tsx')
  } else {
    info('Already deleted — skipping')
    passCount++
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Check if DashboardLayout is even used (might itself be orphaned)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n📌 Fix 4 — Check if DashboardLayout.tsx is used anywhere\n')

const dlUsed = allTsx.filter(f => {
  if (f.includes('DashboardLayout.tsx')) return false
  const content = fs.readFileSync(f, 'utf8')
  return content.includes('DashboardLayout')
})

if (dlUsed.length === 0) {
  info('⚠️  DashboardLayout.tsx is not imported anywhere in the app')
  info('   AppLayout.tsx is the active layout (confirmed from App.tsx)')
  info('   DashboardLayout.tsx appears to be an orphaned legacy layout')
  info('   → Safe to delete manually if you confirm it\'s not needed')
} else {
  ok(`DashboardLayout.tsx is used in: ${dlUsed.map(f => path.relative(ROOT, f)).join(', ')}`)
}

// ─────────────────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(50))
console.log(`\n🏁 Polish Pass 1b Complete — ${passCount} passed, ${failCount} failed\n`)
if (failCount > 0) {
  console.log('  Fix the ❌ items above, then re-run.\n')
} else {
  console.log('  All clean! Run polish-pass-1.js again to confirm full green.\n')
}

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
