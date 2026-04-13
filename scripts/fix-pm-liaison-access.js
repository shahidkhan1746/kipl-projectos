const fs = require('fs')
const path = require('path')

const filePath = path.join(
  process.env.HOME || process.env.USERPROFILE,
  'Desktop', 'kipl-srinagar', 'frontend', 'src', 'components', 'layout', 'Sidebar.tsx'
)

let src = fs.readFileSync(filePath, 'utf8')

// Add project_manager to Files
src = src.replace(
  `{ section:'LIAISON',   label:'Files',         path:'/liaison',            icon:FileText,     roles:['super_admin','liaison_officer'] }`,
  `{ section:'LIAISON',   label:'Files',         path:'/liaison',            icon:FileText,     roles:['super_admin','project_manager','liaison_officer'] }`
)

// Add project_manager to Letters
src = src.replace(
  `{ section:'LIAISON',   label:'Letters',       path:'/liaison/letters',    icon:Envelope,     roles:['super_admin','liaison_officer'] }`,
  `{ section:'LIAISON',   label:'Letters',       path:'/liaison/letters',    icon:Envelope,     roles:['super_admin','project_manager','liaison_officer'] }`
)

fs.writeFileSync(filePath, src, 'utf8')
console.log('✅ Sidebar.tsx — project_manager can now see Liaison > Files & Letters')
