#!/usr/bin/env node
/**
 * Fix employee code format to KIPL-DL-SXR-001
 * Counter auto-increments from last existing code
 */

const fs   = require('fs')
const path = require('path')

const FILE = path.resolve(__dirname, '..', 'frontend', 'src', 'pages', 'hr', 'EmployeesPage.tsx')
let src = fs.readFileSync(FILE, 'utf8')

// Fix the prefix and counter logic
src = src.replace(
  `r.data?.code ?? ('KIPL-' + String((employees?.length ?? 0) + 1).padStart(3,'0'))`,
  `(() => {
          // Find highest existing counter from employee codes
          const codes = (employees ?? [])
            .map((e: any) => e.empCode ?? '')
            .filter((c: string) => c.startsWith('KIPL-DL-SXR-'))
            .map((c: string) => parseInt(c.replace('KIPL-DL-SXR-', '')) || 0)
          const next = codes.length > 0 ? Math.max(...codes) + 1 : 1
          return r.data?.code ?? ('KIPL-DL-SXR-' + String(next).padStart(3, '0'))
        })()`
)

// Fix the placeholder in the form
src = src.replace(
  `placeholder='Auto-generated'`,
  `placeholder='KIPL-DL-SXR-001'`
)

// Fix the format hint text
src = src.replace(
  `Format: KIPL-001 (auto-suggested, editable)`,
  `Format: KIPL-DL-SXR-001 · Dal Lake Srinagar · auto-suggested`
)

// Fix the blank form default empCode hint
src = src.replace(
  `empCode:'',`,
  `empCode:'KIPL-DL-SXR-',`
)

fs.writeFileSync(FILE, src, 'utf8')
console.log('✅  Employee code format updated to KIPL-DL-SXR-001')
console.log('   PM → KIPL-DL-SXR-001')
console.log('   Next employee → KIPL-DL-SXR-002, 003...')
