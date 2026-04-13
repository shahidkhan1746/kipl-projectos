const fs = require('fs')
const f = 'frontend/src/App.tsx'
let s = fs.readFileSync(f, 'utf8')

if (!s.includes('EmployeeDetailPage')) {
  s = s.replace(
    "import EmployeesPage",
    "import EmployeeDetailPage from '@/pages/hr/EmployeeDetailPage'\nimport EmployeesPage"
  )
  console.log('Added import')
}

if (!s.includes("hr/employees/:id")) {
  s = s.replace(
    "<Route path='hr/employees'        element={<EmployeesPage />} />",
    "<Route path='hr/employees'        element={<EmployeesPage />} />\n          <Route path='hr/employees/:id'    element={<EmployeeDetailPage />} />"
  )
  console.log('Added route')
}

fs.writeFileSync(f, s)
console.log('Done')
