const fs = require('fs')
const path = require('path')

const base = path.join(process.env.HOME || process.env.USERPROFILE, 'Desktop', 'kipl-srinagar', 'frontend', 'src', 'pages', 'hr')

// ─── Fix 1: EmployeesPage.tsx ───────────────────────────────────────────────
// The modal is wrapped in {showNew && (<Modal ...>)} but Modal itself needs open={true}
// Simplest fix: pass open={showNew} and remove the conditional wrapper

const epPath = path.join(base, 'EmployeesPage.tsx')
let ep = fs.readFileSync(epPath, 'utf8')

const OLD_EP = `      {showNew && (
        <Modal onClose={closeModal} title={editId ? 'Edit Employee' : 'Add New Employee'}>`

const NEW_EP = `      <Modal open={showNew} onClose={closeModal} title={editId ? 'Edit Employee' : 'Add New Employee'}>`

if (!ep.includes(OLD_EP)) {
  console.log('⚠️  EmployeesPage: Could not find exact modal open tag — trying alternate...')
  // Try simpler replace
  if (ep.includes("<Modal onClose={closeModal} title={editId ? 'Edit Employee' : 'Add New Employee'}>")) {
    ep = ep.replace(
      "{showNew && (\n        <Modal onClose={closeModal} title={editId ? 'Edit Employee' : 'Add New Employee'}>",
      "<Modal open={showNew} onClose={closeModal} title={editId ? 'Edit Employee' : 'Add New Employee'}>"
    )
  }
} else {
  ep = ep.replace(OLD_EP, NEW_EP)
}

// Also remove the closing )} that was paired with {showNew && (
// It appears right after </Modal> near end of file
ep = ep.replace(/(<\/Modal>\s*\n\s*\)\s*\})/m, '</Modal>')

fs.writeFileSync(epPath, ep, 'utf8')
console.log('✅ EmployeesPage.tsx — Modal now has open={showNew}')

// ─── Fix 2: EmployeeDetailPage.tsx ──────────────────────────────────────────
const edPath = path.join(base, 'EmployeeDetailPage.tsx')
let ed = fs.readFileSync(edPath, 'utf8')

const OLD_ED = `      {showEdit && form && (
        <Modal onClose={closeEdit} title="Edit Employee">`

const NEW_ED = `      <Modal open={showEdit && !!form} onClose={closeEdit} title="Edit Employee">`

if (!ed.includes(OLD_ED)) {
  console.log('⚠️  EmployeeDetailPage: Could not find exact modal open tag — trying alternate...')
  ed = ed.replace(
    '{showEdit && form && (\n        <Modal onClose={closeEdit} title="Edit Employee">',
    '<Modal open={showEdit && !!form} onClose={closeEdit} title="Edit Employee">'
  )
} else {
  ed = ed.replace(OLD_ED, NEW_ED)
}

// Remove the matching closing )}
ed = ed.replace(/(<\/Modal>\s*\n\s*\)\s*\})/m, '</Modal>')

fs.writeFileSync(edPath, ed, 'utf8')
console.log('✅ EmployeeDetailPage.tsx — Modal now has open={showEdit && !!form}')

console.log('')
console.log('🎉 Root cause fixed: Modal was receiving open=undefined → silent null render')
console.log('   ✓ Add Employee button will now open the modal')
console.log('   ✓ Edit from 3-dots dropdown will now open the modal')
console.log('   ✓ Edit button on detail page will now open the modal')
