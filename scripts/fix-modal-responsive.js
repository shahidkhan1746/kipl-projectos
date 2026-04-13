const fs = require('fs')
const path = require('path')

const base = path.join(process.env.HOME || process.env.USERPROFILE, 'Desktop', 'kipl-srinagar', 'frontend', 'src', 'pages', 'hr')

// The Modal component uses: width, maxWidth: width (a number in px)
// To make it responsive we need to patch Modal.tsx itself to accept a string OR
// override the box style. Easiest: patch Modal.tsx to support % values.

const modalPath = path.join(process.env.HOME || process.env.USERPROFILE, 'Desktop', 'kipl-srinagar', 'frontend', 'src', 'components', 'ui', 'Modal.tsx')
let modal = fs.readFileSync(modalPath, 'utf8')

// Change width prop type from number to number | string
modal = modal.replace(
  `width?:   number`,
  `width?:   number | string`
)

// Change maxWidth to use the value directly (works for both px numbers and % strings)
// Original: maxWidth: width  — this works fine for strings too since CSS accepts both
// But also add a minWidth so it doesn't collapse on large screens when % is small
modal = modal.replace(
  `    width:        '100%',\n    maxWidth:     width,`,
  `    width:        '92%',\n    maxWidth:     width,\n    minWidth:     320,`
)

fs.writeFileSync(modalPath, modal, 'utf8')
console.log('✅ Modal.tsx — now supports responsive widths (string or number)')

// ─── EmployeesPage.tsx ───────────────────────────────────────────────────────
const epPath = path.join(base, 'EmployeesPage.tsx')
let ep = fs.readFileSync(epPath, 'utf8')

// Replace any fixed width on the Modal (760 or 540 or whatever is there)
ep = ep.replace(
  /(<Modal open=\{showNew\}[^>]*?)(\s+width=\{[^}]+\})?(\s*>)/,
  `$1 width="min(760px, 92vw)"$3`
)

// Remove any minWidth on the inner content div
ep = ep.replace(
  `{ display:'flex', flexDirection:'column', gap:16, minWidth:560 }`,
  `{ display:'flex', flexDirection:'column', gap:16 }`
)
// Also catch if it was already removed
fs.writeFileSync(epPath, ep, 'utf8')
console.log('✅ EmployeesPage.tsx — Modal width: min(760px, 92vw)')

// ─── EmployeeDetailPage.tsx ──────────────────────────────────────────────────
const edPath = path.join(base, 'EmployeeDetailPage.tsx')
let ed = fs.readFileSync(edPath, 'utf8')

ed = ed.replace(
  /(<Modal open=\{showEdit[^}]*\}[^>]*?)(\s+width=\{[^}]+\})?(\s*>)/,
  `$1 width="min(760px, 92vw)"$3`
)

ed = ed.replace(
  `{ display:'flex', flexDirection:'column', gap:16, minWidth:560 }`,
  `{ display:'flex', flexDirection:'column', gap:16 }`
)

fs.writeFileSync(edPath, ed, 'utf8')
console.log('✅ EmployeeDetailPage.tsx — Modal width: min(760px, 92vw)')

console.log('')
console.log('📐 Responsive behaviour:')
console.log('   Desktop (>820px)  → 760px wide, centered')
console.log('   Tablet  (~768px)  → ~92% of viewport')
console.log('   Mobile  (~375px)  → ~92% of viewport (346px), never below 320px')
