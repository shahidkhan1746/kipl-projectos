const fs = require('fs')
const path = require('path')
const f = path.resolve(__dirname, '..', 'frontend', 'src', 'api', 'hr.api.ts')
let s = fs.readFileSync(f, 'utf8')
if (!s.includes('getEmployee')) {
  const last = s.lastIndexOf('}')
  s = s.slice(0, last) + '  getEmployee: (id) => api.get(`/api/v1/hr/employees/${id}`),\n}'
  fs.writeFileSync(f, s)
  console.log('✅  getEmployee added to hr.api.ts')
} else {
  console.log('ℹ️  Already exists')
}
