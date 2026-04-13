// Run: node scripts/fix-wbs-route.js
const fs = require('fs')

const G = '\x1b[32m', NC = '\x1b[0m'
const ok = s => console.log(G + '  ✓' + NC + ' ' + s)

// ── 1. Fix Sidebar — change WBS link from /tasks to /wbs ──────
const sidebarPath = 'frontend/src/components/layout/Sidebar.tsx'
let sidebar = fs.readFileSync(sidebarPath, 'utf8')

console.log('\n[1] Checking sidebar WBS entry...')
const wbsMatch = sidebar.match(/label:'WBS[^}]+}/s)
if (wbsMatch) console.log('Found:', wbsMatch[0].substring(0, 100))

// Replace whatever path WBS & Gantt currently has with /wbs
sidebar = sidebar.replace(
  /\{ label:'WBS[^,]+, path:'[^']*'/,
  "{ label:'WBS & Gantt', path:'/wbs'"
)
fs.writeFileSync(sidebarPath, sidebar)
ok('Sidebar WBS path → /wbs')

// ── 2. Fix App.tsx — ensure WbsPage is imported and routed ───
const appPath = 'frontend/src/App.tsx'
let app = fs.readFileSync(appPath, 'utf8')

console.log('\n[2] Checking App.tsx...')

// Check current wbs-related content
const wbsRoutes = app.match(/path="wbs[^"]*"[^\n]*/g)
console.log('WBS routes found:', wbsRoutes)

// Remove ALL existing wbs routes (stub and new)
app = app.replace(/\s*<Route path="wbs[^"]*"[^/]*\/>/g, '')
app = app.replace(/\s*<Route path="wbs[^"]*"[^>]*>[^<]*<\/Route>/g, '')

// Remove WbsPage import if exists (we'll re-add it cleanly)
app = app.replace(/import WbsPage[^\n]*\n/, '')

// Add clean import at top
app = app.replace(
  "import MeetingsPage",
  "import WbsPage from '@/pages/wbs/WbsPage'\nimport MeetingsPage"
)

// Add route in the right place — after diary, before meetings
app = app.replace(
  '<Route path="meetings"',
  '<Route path="wbs" element={<WbsPage />} />\n          <Route path="meetings"'
)

fs.writeFileSync(appPath, app)
ok('App.tsx — WbsPage imported and routed to /wbs')

// Verify
const check = app.match(/path="wbs"[^\n]*/)?.[0]
console.log('\nRoute now:', check)

// Also check sidebar
const sideCheck = sidebar.match(/label:'WBS[^}]+}/s)?.[0]
console.log('Sidebar:', sideCheck?.substring(0, 80))

console.log('\n' + G + '  Done! Hard refresh: Ctrl+Shift+R\x1b[0m\n')
