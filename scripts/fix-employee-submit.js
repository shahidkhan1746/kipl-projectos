// Run: node scripts/fix-employee-submit.js
const fs   = require('fs')
const path = require('path')

const file = path.join(__dirname, 'frontend', 'src', 'pages', 'hr', 'EmployeesPage.tsx')
let content = fs.readFileSync(file, 'utf8')

// Fix 1: Remove baseSalary from disabled condition — only require empCode and firstName
content = content.replace(
  /disabled=\{!form\.empCode \|\| !form\.firstName \|\| !form\.baseSalary\}/g,
  "disabled={!form.empCode || !form.firstName}"
)

// Fix 2: Make baseSalary default to 0 if empty so API doesn't reject
content = content.replace(
  /baseSalary: parseFloat\(d\.baseSalary\),/g,
  "baseSalary: parseFloat(d.baseSalary) || 0,"
)

// Fix 3: Add onError handler to show what went wrong
if (!content.includes('onError')) {
  content = content.replace(
    /onSuccess: \(\) => \{/,
    [
      "onError: (err: any) => {",
      "      const msg = err?.response?.data?.message ?? err?.response?.data?.error ?? err?.message ?? 'Failed to add employee'",
      "      alert('Error: ' + (Array.isArray(msg) ? msg.join(', ') : String(msg)))",
      "    },",
      "    onSuccess: () => {",
    ].join('\n    ')
  )
}

fs.writeFileSync(file, content, 'utf8')
console.log('✓ Fixed: button no longer requires salary to be filled')
console.log('✓ Fixed: baseSalary defaults to 0 if empty')
console.log('✓ Fixed: errors now show as alert so you can see what failed')
console.log('\nNow try adding an employee with just Code + First Name filled.')
