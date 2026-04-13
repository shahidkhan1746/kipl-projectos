#!/usr/bin/env node
/**
 * Add invoice methods to frontend/src/api/accounting.api.ts
 */

const fs   = require('fs')
const path = require('path')

const apiPath = path.resolve(__dirname, '..', 'frontend', 'src', 'api', 'accounting.api.ts')
let src = fs.readFileSync(apiPath, 'utf8')

if (src.includes('invoices')) {
  console.log('  ℹ️   Invoice methods already present')
  process.exit(0)
}

// Add invoice methods before closing }
src = src.replace(
  /(\s*tds:.*\n\s*depositTds:.*),?\s*\n?}/,
  `$1,
  invoices:       (p?: any) => api.get('/api/v1/accounting/invoices', { params: p }),
  createInvoice:  (d: any) => api.post('/api/v1/accounting/invoices', d),
  updateInvoice:  (id: string, d: any) => api.patch('/api/v1/accounting/invoices/' + id, d),
  deleteInvoice:  (id: string) => api.delete('/api/v1/accounting/invoices/' + id),
}`
)

fs.writeFileSync(apiPath, src, 'utf8')
console.log('  ✅  Invoice methods added to accounting.api.ts')
console.log('  Now update InvoicesPage to use accountingApi.invoices() instead of direct api.get()')
