#!/usr/bin/env node
const fs   = require('fs')
const path = require('path')

const FILE = path.resolve(__dirname, '..', 'frontend', 'src', 'pages', 'hr', 'EmployeesPage.tsx')
let src = fs.readFileSync(FILE, 'utf8')

// ── 1. Add useNavigate import ─────────────────────────────────────────────────
if (!src.includes('useNavigate')) {
  src = src.replace(
    `import { useState } from 'react'`,
    `import { useState } from 'react'\nimport { useNavigate } from 'react-router-dom'`
  )
  console.log('✅  useNavigate imported')
}

// ── 2. Add nav = useNavigate() after existing hooks ───────────────────────────
if (!src.includes('const nav = useNavigate')) {
  src = src.replace(
    `  const { activeProjectId } = useAuthStore()`,
    `  const nav = useNavigate()\n  const { activeProjectId } = useAuthStore()`
  )
  console.log('✅  nav = useNavigate() added')
}

// ── 3. Make employee row click navigate to detail page ────────────────────────
// Current: onClick={()=>setSelected(...)}
// Change: onClick navigates to /hr/employees/:id
src = src.replace(
  `onClick={()=>setSelected(selected?.id===emp.id?null:emp)}`,
  `onClick={()=>nav('/hr/employees/'+emp.id)}`
)
console.log('✅  Employee row click → navigate to /hr/employees/:id')

// ── 4. Move login section to bottom ──────────────────────────────────────────
// Find the login block start and end
const BLOCK_MARKER = `{/* Login credentials */}`
const blockStart = src.indexOf(BLOCK_MARKER)

if (blockStart === -1) {
  console.log('⚠️   Login block not found — may already be at bottom')
} else {
  // Find the closing </div> of the login block
  // Count nested divs from blockStart
  let depth = 0
  let i = blockStart
  let blockEnd = -1

  while (i < src.length) {
    if (src.slice(i, i + 4) === '<div') depth++
    if (src.slice(i, i + 6) === '</div>') {
      if (depth > 0) depth--
      if (depth === 0) { blockEnd = i + 6; break }
    }
    i++
  }

  if (blockEnd !== -1) {
    // Extract the full login block (include wrapping div that has gridColumn)
    // Go back to find the wrapping div
    const wrapperStart = src.lastIndexOf('<div', blockStart)
    const loginBlock = src.slice(wrapperStart, blockEnd)

    // Remove it from current position (include any leading whitespace/newlines)
    const removeStart = src.lastIndexOf('\n', wrapperStart)
    src = src.slice(0, removeStart) + src.slice(blockEnd)

    // Find PAN No field - insert login block after its containing grid closes
    const panField = `<Input label='PAN No'`
    const panIdx = src.indexOf(panField)
    if (panIdx !== -1) {
      // Find the closing </div> after PAN
      const gridClose = src.indexOf('</div>', panIdx) + 6
      const cleanBlock = loginBlock.replace(`gridColumn:'1/-1', `, '').replace(`gridColumn:'1/-1',`, '')
      src = src.slice(0, gridClose) + '\n              ' + cleanBlock.trim() + src.slice(gridClose)
      console.log('✅  Login section moved to bottom of Personal Info tab')
    }
  }
}

fs.writeFileSync(FILE, src, 'utf8')
console.log('\n🏁  Done — employee rows now navigate to detail page')
