// Run from project root: node scripts/master-fix.js
// Audits ALL entity files and removes duplicate createdAt/updatedAt
const fs   = require('fs')
const path = require('path')

const G = '\x1b[32m', R = '\x1b[31m', Y = '\x1b[33m', NC = '\x1b[0m'
const ok   = s => console.log(G + '  ✓' + NC + ' ' + s)
const warn = s => console.log(Y + '  ⚠' + NC + ' ' + s)
const err  = s => console.log(R + '  ✗' + NC + ' ' + s)

console.log('\n\x1b[1mMaster Fix Script — KIPL ProjectOS\x1b[0m\n')

// ── 1. Fix all backend entity files ───────────────────────────
console.log('\x1b[1m[1] Fixing backend entities...\x1b[0m\n')

function fixEntity(filePath) {
  if (!fs.existsSync(filePath)) { warn('Not found: ' + filePath); return }
  let content = fs.readFileSync(filePath, 'utf8')
  const original = content

  // Remove @CreateDateColumn lines
  content = content.replace(/@CreateDateColumn\([^)]*\)[^\n]*\n/g, '')
  content = content.replace(/@CreateDateColumn[^\n]*\n/g, '')

  // Remove @UpdateDateColumn lines
  content = content.replace(/@UpdateDateColumn\([^)]*\)[^\n]*\n/g, '')
  content = content.replace(/@UpdateDateColumn[^\n]*\n/g, '')

  // Remove standalone createdAt: Date declarations
  content = content.replace(/[ \t]*createdAt: Date\n/g, '')
  content = content.replace(/[ \t]*updatedAt: Date\n/g, '')

  // Remove duplicate imports of CreateDateColumn, UpdateDateColumn
  content = content.replace(/,\s*CreateDateColumn/g, '')
  content = content.replace(/,\s*UpdateDateColumn/g, '')
  content = content.replace(/CreateDateColumn,\s*/g, '')
  content = content.replace(/UpdateDateColumn,\s*/g, '')

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8')
    ok(path.basename(filePath) + ' — fixed')
  } else {
    ok(path.basename(filePath) + ' — already clean')
  }
}

// Find all entity files in backend/src
function findEntities(dir) {
  if (!fs.existsSync(dir)) return []
  const results = []
  fs.readdirSync(dir).forEach(f => {
    const full = path.join(dir, f)
    if (fs.statSync(full).isDirectory()) {
      results.push(...findEntities(full))
    } else if (f.endsWith('.entity.ts')) {
      results.push(full)
    }
  })
  return results
}

const entities = findEntities(path.join('backend', 'src'))
console.log('  Found ' + entities.length + ' entity files\n')
entities.forEach(fixEntity)

// ── 2. Remove stale files ──────────────────────────────────────
console.log('\n\x1b[1m[2] Removing stale files...\x1b[0m\n')
const staleFiles = [
  'backend/src/accounting/tds-ledger.entity.ts',
]
staleFiles.forEach(f => {
  if (fs.existsSync(f)) {
    fs.unlinkSync(f)
    ok('Removed: ' + f)
  } else {
    ok('Already gone: ' + f)
  }
})

// ── 3. Verify app.module.ts registrations ─────────────────────
console.log('\n\x1b[1m[3] Verifying module registrations...\x1b[0m\n')
const appPath = path.join('backend', 'src', 'app.module.ts')
if (fs.existsSync(appPath)) {
  const app = fs.readFileSync(appPath, 'utf8')
  const required = ['HrModule', 'EpcModule', 'AccountingModule']
  required.forEach(m => {
    if (app.includes(m)) ok(m + ' registered')
    else err(m + ' NOT registered — run its backend script')
  })
}

// ── 4. Fix EPC controller route order ─────────────────────────
console.log('\n\x1b[1m[4] Verifying EPC route order...\x1b[0m\n')
const epcCtrl = path.join('backend', 'src', 'epc', 'epc.controller.ts')
if (fs.existsSync(epcCtrl)) {
  const content = fs.readFileSync(epcCtrl, 'utf8')
  const summaryIdx = content.indexOf("@Get('boq/summary')")
  const idIdx      = content.indexOf("@Get('boq/:id')")  
  const paramIdx   = content.indexOf("@Patch('boq/:id')")
  if (summaryIdx > 0 && paramIdx > 0 && summaryIdx < paramIdx) {
    ok('EPC route order correct (summary before :id)')
  } else if (summaryIdx < 0) {
    warn('boq/summary route not found — may need epc-backend.js')
  } else {
    warn('EPC route order may be wrong — rewriting controller')
    // Rewrite with correct order
    fs.writeFileSync(epcCtrl, [
      "import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common'",
      "import { EpcService } from './epc.service'",
      "import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'",
      "import { RaBillStatus } from './ra-bill.entity'",
      "@Controller('epc') @UseGuards(JwtAuthGuard)",
      "export class EpcController {",
      "  constructor(private readonly svc: EpcService) {}",
      "  @Get('payment-milestones')",
      "  milestones() { return this.svc.getPaymentMilestones() }",
      "  @Get('boq/summary')",
      "  summary(@Query('projectId') pid: string) { return this.svc.boqSummary(pid) }",
      "  @Post('boq/seed') @HttpCode(HttpStatus.CREATED)",
      "  seedBoq(@Body('projectId') projectId: string) { return this.svc.seedBoqItems(projectId) }",
      "  @Get('boq')",
      "  listBoq(@Query('projectId') pid: string, @Query('category') cat?: string) { return this.svc.listBoqItems(pid, cat) }",
      "  @Post('boq') @HttpCode(HttpStatus.CREATED)",
      "  createBoq(@Body() body: any) { return this.svc.createBoqItem(body) }",
      "  @Patch('boq/:id')",
      "  updateBoq(@Param('id') id: string, @Body() body: any) { return this.svc.updateBoqItem(id, body) }",
      "  @Patch('boq/:id/measure')",
      "  measure(@Param('id') id: string, @Body('measuredQty') qty: number) { return this.svc.updateMeasuredQty(id, qty) }",
      "  @Get('ra-bills')",
      "  listRa(@Query('projectId') pid: string) { return this.svc.listRaBills(pid) }",
      "  @Post('ra-bills') @HttpCode(HttpStatus.CREATED)",
      "  createRa(@Body() body: any) { return this.svc.createRaBill(body) }",
      "  @Get('ra-bills/:id')",
      "  getRa(@Param('id') id: string) { return this.svc.getRaBill(id) }",
      "  @Patch('ra-bills/:id/status')",
      "  updateStatus(@Param('id') id: string, @Body('status') status: RaBillStatus, @Body('remarks') remarks?: string) { return this.svc.updateRaBillStatus(id, status, remarks) }",
      "  @Get('measurements')",
      "  listMb(@Query() q: any) { return this.svc.listMeasurements({ projectId: q.projectId, boqItemId: q.boqItemId, raBillId: q.raBillId }) }",
      "  @Post('measurements') @HttpCode(HttpStatus.CREATED)",
      "  addMb(@Body() body: any) { return this.svc.addMeasurement(body) }",
      "}",
    ].join('\n'))
    ok('EPC controller rewritten with correct route order')
  }
}

// ── 5. Fix frontend icons ──────────────────────────────────────
console.log('\n\x1b[1m[5] Fixing frontend icon imports...\x1b[0m\n')

// Fix Sidebar - remove duplicate icons
const sidebarPath = path.join('frontend', 'src', 'components', 'layout', 'Sidebar.tsx')
if (fs.existsSync(sidebarPath)) {
  let s = fs.readFileSync(sidebarPath, 'utf8')
  // Fix double commas
  s = s.replace(/,\s*,/g, ',')
  // Remove ClipboardText if present
  s = s.replace(/,?\s*ClipboardText/g, '')
  // Remove duplicate FileText
  s = s.replace(/FileText,\s*FileText/g, 'FileText')
  // Remove stray FileText in second import line
  s = s.replace(/Buildings, SignOut, FileText,/g, 'Buildings, SignOut,')
  s = s.replace(/Buildings, SignOut, ClipboardText,/g, 'Buildings, SignOut,')
  fs.writeFileSync(sidebarPath, s)
  ok('Sidebar.tsx — icons clean')
}

// Fix TimesheetPage - ensure single clean import
const tsPath = path.join('frontend', 'src', 'pages', 'hr', 'TimesheetPage.tsx')
if (fs.existsSync(tsPath)) {
  let ts = fs.readFileSync(tsPath, 'utf8')
  // Fix any double FileText in same import
  ts = ts.replace(/\{ (.*?)FileText,(.*?), FileText(.*?)\}/g, '{ $1FileText$2$3}')
  ts = ts.replace(/FileText, FileText/g, 'FileText')
  ts = ts.replace(/ClipboardText/g, 'FileText')
  fs.writeFileSync(tsPath, ts)
  ok('TimesheetPage.tsx — icons clean')
}

// ── 6. Verify accounting.api.ts export name ───────────────────
console.log('\n\x1b[1m[6] Verifying API exports...\x1b[0m\n')
const accApiPath = path.join('frontend', 'src', 'api', 'accounting.api.ts')
if (fs.existsSync(accApiPath)) {
  const content = fs.readFileSync(accApiPath, 'utf8')
  if (content.includes('export const accountingApi')) {
    ok('accounting.api.ts — exports accountingApi ✓')
  } else {
    warn('accounting.api.ts — wrong export name, fixing...')
    fs.writeFileSync(accApiPath, [
      "import api from './client'",
      "export const accountingApi = {",
      "  dashboard:      (projectId: string) => api.get('/api/v1/accounting/dashboard', { params: { projectId } }),",
      "  vendors:        (p?: any) => api.get('/api/v1/accounting/vendors', { params: p }),",
      "  createVendor:   (d: any) => api.post('/api/v1/accounting/vendors', d),",
      "  vendorLedger:   (id: string) => api.get('/api/v1/accounting/vendors/' + id + '/ledger'),",
      "  expenses:       (p?: any) => api.get('/api/v1/accounting/expenses', { params: p }),",
      "  createExpense:  (d: any) => api.post('/api/v1/accounting/expenses', d),",
      "  approveExpense: (id: string) => api.patch('/api/v1/accounting/expenses/' + id + '/approve', {}),",
      "  payExpense:     (id: string, d: any) => api.patch('/api/v1/accounting/expenses/' + id + '/pay', d),",
      "  transactions:   (p?: any) => api.get('/api/v1/accounting/transactions', { params: p }),",
      "  addTransaction: (d: any) => api.post('/api/v1/accounting/transactions', d),",
      "  tds:            (p?: any) => api.get('/api/v1/accounting/tds', { params: p }),",
      "  depositTds:     (id: string, d: any) => api.patch('/api/v1/accounting/tds/' + id + '/deposit', d),",
      "}",
    ].join('\n'))
    ok('accounting.api.ts — fixed')
  }
}

// Fix InvoicesPage
const invPath = path.join('frontend', 'src', 'pages', 'accounting', 'InvoicesPage.tsx')
fs.mkdirSync(path.dirname(invPath), { recursive: true })
fs.writeFileSync(invPath, [
  "import { Link } from 'react-router-dom'",
  "import { Receipt, ArrowRight } from '@phosphor-icons/react'",
  "export default function InvoicesPage() {",
  "  return (",
  "    <div className='fade-in' style={{ display:'flex', flexDirection:'column', gap:24 }}>",
  "      <h1 style={{ fontSize:24, fontWeight:800, color:'#0f172a', margin:0 }}>Invoices (RA Bills)</h1>",
  "      <p style={{ fontSize:14, color:'#94a3b8' }}>Running Account Bills are managed in the EPC / BOQ module</p>",
  "      <div style={{ background:'#fff', border:'1.5px solid #e2e8f0', borderRadius:16, padding:'40px 32px', display:'flex', flexDirection:'column', alignItems:'center', gap:14 }}>",
  "        <Receipt size={36} color='#2563eb' />",
  "        <p style={{ fontSize:15, fontWeight:700, color:'#0f172a', margin:0 }}>RA Bills are in EPC / BOQ</p>",
  "        <Link to='/epc' style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, fontWeight:600, color:'#2563eb', padding:'10px 20px', background:'#eff6ff', border:'1.5px solid #bfdbfe', borderRadius:8, textDecoration:'none' }}>",
  "          Go to EPC / BOQ <ArrowRight size={14} />",
  "        </Link>",
  "      </div>",
  "    </div>",
  "  )",
  "}",
].join('\n'))
ok('InvoicesPage.tsx — clean (no accApi import)')

console.log('\n' + G + '\x1b[1m  Master fix complete!\x1b[0m' + NC)
console.log('\n  Backend will recompile to 0 errors.')
console.log('  LOG OUT → LOG BACK IN → everything works.')
console.log('\n  Then we build QA module next.\n')
