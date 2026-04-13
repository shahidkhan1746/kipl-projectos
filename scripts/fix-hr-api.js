#!/usr/bin/env node
const fs   = require('fs')
const path = require('path')

const FILE = path.resolve(__dirname, '..', 'frontend', 'src', 'api', 'hr.api.ts')
let src = fs.readFileSync(FILE, 'utf8')

if (src.includes('updateEmployee')) {
  console.log('ℹ️  Already present')
  process.exit(0)
}

// Add before closing }
src = src.replace(
  /(\s*salary_summary:.*\n.*),?\s*\n?\s*\}/s,
  (match) => {
    const lastBrace = match.lastIndexOf('}')
    return match.slice(0, lastBrace) +
      `,\n  updateEmployee: (id: string, d: any) => api.patch('/api/v1/hr/employees/' + id, d),\n  deleteEmployee: (id: string) => api.delete('/api/v1/hr/employees/' + id),\n}`
  }
)

// Simpler approach — just append before last }
const lastBrace = src.lastIndexOf('}')
src = src.slice(0, lastBrace) +
  `  updateEmployee: (id: string, d: any) => api.patch('/api/v1/hr/employees/' + id, d),\n` +
  `  deleteEmployee: (id: string) => api.delete('/api/v1/hr/employees/' + id),\n}`

fs.writeFileSync(FILE, src, 'utf8')
console.log('✅  updateEmployee + deleteEmployee added to hr.api.ts')
