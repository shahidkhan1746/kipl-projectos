// Run: node scripts/fix-sidebar-gear.js
const fs = require('fs')
const p = 'frontend/src/components/layout/Sidebar.tsx'
let c = fs.readFileSync(p, 'utf8')

c = c.replace(
  "  ClipboardText, UserCircle, ChartBar, FilePdf,\n} from '@phosphor-icons/react'",
  "  ClipboardText, UserCircle, ChartBar, FilePdf, Gear,\n} from '@phosphor-icons/react'"
)

fs.writeFileSync(p, c)
console.log('Fixed — Gear added to import')
console.log('Gear count:', (c.match(/Gear/g) || []).length)
