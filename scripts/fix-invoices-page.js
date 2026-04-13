#!/usr/bin/env node
/**
 * Fix InvoicesPage.tsx — replace raw api.get('/accounting/invoices') 
 * with accountingApi.invoices() which has correct /api/v1 prefix
 */

const fs   = require('fs')
const path = require('path')

const filePath = path.resolve(__dirname, '..', 'frontend', 'src', 'pages', 'accounting', 'InvoicesPage.tsx')
let src = fs.readFileSync(filePath, 'utf8')

// Replace raw api import + calls with accountingApi
src = src.replace(
  `import api from '@/api/client'`,
  `import { accountingApi } from '@/api/accounting.api'`
)

// Fix the useQuery call
src = src.replace(
  `queryFn: () => api.get('/accounting/invoices', { params:{ projectId: activeProjectId } }).then(r => r.data),`,
  `queryFn: () => accountingApi.invoices({ projectId: activeProjectId }).then(r => r.data),`
)

// Fix the saveMutation - POST
src = src.replace(
  `? api.patch(\`/accounting/invoices/\${editId}\`, body).then(r => r.data)`,
  `? accountingApi.updateInvoice(editId, body).then(r => r.data)`
)
src = src.replace(
  `: api.post('/accounting/invoices', { ...body, projectId: activeProjectId }).then(r => r.data)`,
  `: accountingApi.createInvoice({ ...body, projectId: activeProjectId }).then(r => r.data)`
)

// Fix delete mutation
src = src.replace(
  `mutationFn: (id:string) => api.delete(\`/accounting/invoices/\${id}\`),`,
  `mutationFn: (id:string) => accountingApi.deleteInvoice(id),`
)

fs.writeFileSync(filePath, src, 'utf8')
console.log('  ✅  InvoicesPage.tsx now uses accountingApi (correct /api/v1 prefix)')
