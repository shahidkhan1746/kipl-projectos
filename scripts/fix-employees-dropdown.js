const fs = require('fs')
const path = require('path')

const filePath = path.join(process.env.HOME || process.env.USERPROFILE, 'Desktop', 'kipl-srinagar', 'frontend', 'src', 'pages', 'hr', 'EmployeesPage.tsx')

let src = fs.readFileSync(filePath, 'utf8')

// Fix: change overflow:'hidden' to overflow:'visible' on table wrapper
// This unclips the dropdown menu from the table container
const OLD = `{ background:C.card, border:'1.5px solid '+C.border, borderRadius:16, overflow:'hidden' }`
const NEW = `{ background:C.card, border:'1.5px solid '+C.border, borderRadius:16, overflow:'visible' }`

if (!src.includes(OLD)) {
  console.log('❌ Could not find target string. Already patched or file changed.')
  process.exit(1)
}

src = src.replace(OLD, NEW)
fs.writeFileSync(filePath, src, 'utf8')
console.log('✅ EmployeesPage.tsx — overflow fixed. Dropdown will now render correctly.')
