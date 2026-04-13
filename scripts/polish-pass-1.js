#!/usr/bin/env node
/**
 * KIPL ProjectOS — Polish Pass 1
 * Fixes:
 *   1. Adds "Invoices" sidebar link under FINANCE section
 *   2. Deletes orphaned components/ui/Sidebar.tsx
 *   3. Deletes orphaned pages/tasks/KanbanPage.tsx (unrouted stub)
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
// 1. Add Invoices link to Sidebar
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n📌 Fix 1 — Add Invoices sidebar link under FINANCE\n')

const sidebarPath = path.join(FRONTEND, 'components', 'layout', 'Sidebar.tsx')

if (!fs.existsSync(sidebarPath)) {
  fail(`Sidebar not found at ${sidebarPath}`)
} else {
  let src = fs.readFileSync(sidebarPath, 'utf8')

  const invoiceLine = `  { section:'FINANCE',   label:'Invoices',      path:'/accounting/invoices', icon:CurrencyInr,  roles:['super_admin','project_manager','accounts'] },`

  // Check if already added
  if (src.includes("path:'/accounting/invoices'")) {
    info('Invoices link already present in Sidebar — skipping')
    passCount++
  } else {
    // Insert after the Accounting line
    const target = `  { section:'FINANCE',   label:'Accounting',    path:'/accounting',         icon:ChartBar,     roles:['super_admin','project_manager','accounts'] },`

    if (!src.includes(target)) {
      fail('Could not find Accounting link anchor in Sidebar to insert after — manual fix needed')
      info('Add this line manually after the Accounting entry in ALL_LINKS:')
      info(invoiceLine)
    } else {
      src = src.replace(target, target + '\n' + invoiceLine)
      fs.writeFileSync(sidebarPath, src, 'utf8')
      ok('Invoices link added under FINANCE in Sidebar.tsx')
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Delete orphaned components/ui/Sidebar.tsx
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n📌 Fix 2 — Remove orphaned components/ui/Sidebar.tsx\n')

const uiSidebar = path.join(FRONTEND, 'components', 'ui', 'Sidebar.tsx')

if (!fs.existsSync(uiSidebar)) {
  info('components/ui/Sidebar.tsx not found — already cleaned or never existed')
  passCount++
} else {
  // Safety check: make sure nothing imports it
  const allTsx = getAllFiles(path.join(FRONTEND), '.tsx')
  const importers = allTsx.filter(f => {
    const content = fs.readFileSync(f, 'utf8')
    return content.includes("components/ui/Sidebar") || content.includes("ui/Sidebar")
  })

  const safeImporters = importers.filter(f => !f.includes('ui/Sidebar.tsx'))

  if (safeImporters.length > 0) {
    fail(`components/ui/Sidebar.tsx is imported in:\n    ${safeImporters.join('\n    ')}\n    Remove those imports first — skipping deletion`)
  } else {
    fs.unlinkSync(uiSidebar)
    ok('Deleted components/ui/Sidebar.tsx (was never imported anywhere)')
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Delete orphaned pages/tasks/KanbanPage.tsx
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n📌 Fix 3 — Remove orphaned KanbanPage.tsx (unrouted stub)\n')

const kanbanPath = path.join(FRONTEND, 'pages', 'tasks', 'KanbanPage.tsx')

if (!fs.existsSync(kanbanPath)) {
  info('KanbanPage.tsx not found — already cleaned or never existed')
  passCount++
} else {
  const allFiles = getAllFiles(path.join(FRONTEND), '.tsx').concat(getAllFiles(path.join(FRONTEND), '.ts'))
  const kanbanImporters = allFiles.filter(f => {
    if (f.includes('KanbanPage.tsx')) return false
    const content = fs.readFileSync(f, 'utf8')
    return content.includes('KanbanPage')
  })

  if (kanbanImporters.length > 0) {
    fail(`KanbanPage is still referenced in:\n    ${kanbanImporters.join('\n    ')}\n    Remove those references first — skipping deletion`)
  } else {
    fs.unlinkSync(kanbanPath)
    ok('Deleted KanbanPage.tsx (unrouted placeholder stub, TasksPage is the real task module)')
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Verify App.tsx has no route for /kanban (cleanup check)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n📌 Fix 4 — Verify App.tsx has no dangling /kanban route\n')

const appPath = path.join(FRONTEND, 'App.tsx')
if (fs.existsSync(appPath)) {
  const appSrc = fs.readFileSync(appPath, 'utf8')
  if (appSrc.includes("'kanban'") || appSrc.includes('"/kanban"') || appSrc.includes("KanbanPage")) {
    fail('App.tsx still references KanbanPage or /kanban route — remove it manually')
  } else {
    ok('App.tsx has no dangling /kanban route — clean')
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Confirm all sidebar paths have matching App.tsx routes
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n📌 Fix 5 — Cross-check Sidebar paths vs App.tsx routes\n')

if (fs.existsSync(sidebarPath) && fs.existsSync(appPath)) {
  const sidebarSrc = fs.readFileSync(sidebarPath, 'utf8')
  const appSrc     = fs.readFileSync(appPath, 'utf8')

  // Extract all path:'/...' values from sidebar
  const pathMatches = [...sidebarSrc.matchAll(/path:'([^']+)'/g)].map(m => m[1])

  const unrouted = []
  for (const p of pathMatches) {
    // Strip leading slash for route matching
    const stripped = p.replace(/^\//, '')
    if (!appSrc.includes(`'${stripped}'`) && !appSrc.includes(`"${stripped}"`)) {
      unrouted.push(p)
    }
  }

  if (unrouted.length === 0) {
    ok('All sidebar paths have corresponding routes in App.tsx')
  } else {
    fail(`These sidebar paths have NO matching route in App.tsx:\n    ${unrouted.join('\n    ')}`)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(50))
console.log(`\n🏁 Polish Pass 1 Complete — ${passCount} passed, ${failCount} failed\n`)
if (failCount > 0) {
  console.log('  Fix the ❌ items above, then re-run this script to verify.\n')
} else {
  console.log('  All clean! Ready for Polish Pass 2.\n')
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
