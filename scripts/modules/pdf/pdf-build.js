// Run from project root: node scripts/modules/pdf/build.js
const fs   = require('fs')
const path = require('path')

const SRC   = path.join('backend', 'src')
const FSRC  = path.join('frontend', 'src')
const PDF   = path.join(SRC, 'pdf')

const G = '\x1b[32m', NC = '\x1b[0m'
const ok = s => console.log(G + '  ✓' + NC + ' ' + s)

console.log('\n\x1b[1mBuilding PDF Reports Module\x1b[0m\n')

fs.mkdirSync(PDF, { recursive: true })
fs.mkdirSync(path.join(FSRC, 'pages', 'reports'), { recursive: true })

// ── Add pdfkit to backend ─────────────────────────────────────
const pkgPath = path.join('backend', 'package.json')
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
if (!pkg.dependencies['pdfkit']) {
  pkg.dependencies['pdfkit'] = '^0.15.0'
  pkg.dependencies['@types/pdfkit'] = '^0.13.0'
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2))
  console.log('  → Added pdfkit — run: cd backend && npm install')
} else { ok('pdfkit already in package.json') }

// ── PDF Service ───────────────────────────────────────────────
fs.writeFileSync(path.join(PDF, 'pdf.service.ts'), `import { Injectable } from '@nestjs/common'
import * as PDFDocument from 'pdfkit'

const KIPL = {
  name:    'M/S Khilari Infrastructure Pvt. Ltd.',
  address: '101 to 105, Prabhat Centre Annex, Sector-1A, C.B.D Belapur, Navi Mumbai - 400 614',
  phone:   '2758 0681',
  email:   'ssk.kipl2005@gmail.com',
  website: 'www.khilariinfra.com',
  project: 'Survey, Design & Execution of Sewerage Scheme Dal Lake (Uncovered Areas), Kashmir J&K',
  allotment: 'CE/UEED/PS/01 OF 2025-26',
}

@Injectable()
export class PdfService {

  // ── SALARY SLIP ────────────────────────────────────────────
  async generateSalarySlip(data: {
    employee: any
    record: any
    month: number
    year: number
    daysPresent: number
    totalDays: number
  }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = []
      const doc = new PDFDocument({ size: 'A4', margin: 40 })

      doc.on('data', chunk => chunks.push(chunk))
      doc.on('end',  () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      const { employee: emp, record: rec, month, year, daysPresent, totalDays } = data
      const monthName = ['','January','February','March','April','May','June','July','August','September','October','November','December'][month]

      // Header
      doc.rect(0, 0, 595, 80).fill('#1a2540')
      doc.fillColor('#ffffff').fontSize(16).font('Helvetica-Bold')
         .text(KIPL.name, 40, 18, { align: 'center' })
      doc.fontSize(9).font('Helvetica')
         .text(KIPL.address, 40, 38, { align: 'center' })
         .text('Tel: ' + KIPL.phone + '  |  Email: ' + KIPL.email, 40, 50, { align: 'center' })

      // Slip title
      doc.fillColor('#1a2540').fontSize(14).font('Helvetica-Bold')
         .text('SALARY SLIP', 40, 95, { align: 'center' })
      doc.fontSize(10).font('Helvetica')
         .text('Month: ' + monthName + ' ' + year, 40, 115, { align: 'center' })

      // Divider
      doc.moveTo(40, 135).lineTo(555, 135).strokeColor('#e2e8f0').lineWidth(1).stroke()

      // Employee info box
      doc.rect(40, 145, 515, 80).strokeColor('#e2e8f0').lineWidth(1).stroke()
      doc.fillColor('#f8f9fc').rect(40, 145, 515, 24).fill()
      doc.fillColor('#1a2540').fontSize(10).font('Helvetica-Bold')
         .text('EMPLOYEE DETAILS', 50, 152)

      const empY = 178
      doc.fillColor('#475569').fontSize(9).font('Helvetica')
      doc.text('Employee Code:', 50,  empY).text(emp.empCode || '—',   160, empY)
      doc.text('Name:',          50,  empY+16).text((emp.firstName||'') + ' ' + (emp.lastName||''), 160, empY+16)
      doc.text('Designation:',   50,  empY+32).text(emp.designation || '—', 160, empY+32)
      doc.text('Department:',    310, empY).text(emp.department || '—', 420, empY)
      doc.text('Joining Date:',  310, empY+16).text(emp.dateOfJoining || '—', 420, empY+16)
      doc.text('PAN:',           310, empY+32).text(emp.panNo || '—', 420, empY+32)

      // Attendance
      doc.rect(40, 240, 515, 40).strokeColor('#e2e8f0').stroke()
      doc.fillColor('#f8f9fc').rect(40, 240, 515, 20).fill()
      doc.fillColor('#1a2540').fontSize(9).font('Helvetica-Bold').text('ATTENDANCE', 50, 246)
      doc.fillColor('#475569').font('Helvetica')
      doc.text('Working Days: ' + totalDays, 50, 263)
         .text('Days Present: ' + daysPresent, 200, 263)
         .text('Days Absent: ' + (totalDays - daysPresent), 350, 263)
         .text('LOP Days: ' + rec.lopDays, 460, 263)

      // Earnings and Deductions
      const tableY = 295
      // Earnings column
      doc.rect(40, tableY, 250, 22).fill('#1a2540')
      doc.fillColor('#fff').fontSize(9).font('Helvetica-Bold').text('EARNINGS', 50, tableY+7)

      const earnings = [
        ['Basic Salary',    rec.basicSalary],
        ['HRA',             rec.hra],
        ['Allowances',      rec.allowances],
        ['Gross Salary',    rec.grossSalary],
      ]
      earnings.forEach(([label, val], i) => {
        const y = tableY + 22 + (i * 20)
        if (i % 2 === 0) doc.rect(40, y, 250, 20).fill('#f8f9fc')
        doc.fillColor('#374151').font('Helvetica').fontSize(9)
           .text(label, 50, y + 6)
        doc.text('₹ ' + Number(val||0).toLocaleString('en-IN'), 220, y + 6, { align: 'right', width: 60 })
      })

      // Deductions column
      doc.rect(305, tableY, 250, 22).fill('#dc2626')
      doc.fillColor('#fff').fontSize(9).font('Helvetica-Bold').text('DEDUCTIONS', 315, tableY+7)

      const deductions = [
        ['PF (Employee 12%)', rec.pfEmployee],
        ['ESI (0.75%)',       rec.esi || 0],
        ['LOP Deduction',     rec.lopDeduction || 0],
        ['Total Deductions',  rec.totalDeductions],
      ]
      deductions.forEach(([label, val], i) => {
        const y = tableY + 22 + (i * 20)
        if (i % 2 === 0) doc.rect(305, y, 250, 20).fill('#fef2f2')
        doc.fillColor('#374151').font('Helvetica').fontSize(9)
           .text(label, 315, y + 6)
        doc.text('₹ ' + Number(val||0).toLocaleString('en-IN'), 490, y + 6, { align: 'right', width: 55 })
      })

      // Net Pay box
      const netY = tableY + 22 + (4 * 20) + 10
      doc.rect(40, netY, 515, 40).fill('#1a2540')
      doc.fillColor('#fff').fontSize(12).font('Helvetica-Bold')
         .text('NET PAY:', 50, netY + 12)
         .text('₹ ' + Number(rec.netSalary||0).toLocaleString('en-IN'), 400, netY + 12, { align: 'right', width: 145 })

      // Amount in words
      doc.fillColor('#475569').fontSize(8).font('Helvetica')
         .text('Amount in Words: ' + amountInWords(Number(rec.netSalary||0)) + ' Only', 40, netY + 55)

      // Bank details
      const bankY = netY + 75
      if (emp.bankAccount?.bankName) {
        doc.rect(40, bankY, 515, 50).strokeColor('#e2e8f0').stroke()
        doc.fillColor('#f8f9fc').rect(40, bankY, 515, 20).fill()
        doc.fillColor('#1a2540').fontSize(9).font('Helvetica-Bold').text('BANK DETAILS', 50, bankY + 6)
        doc.fillColor('#475569').font('Helvetica')
           .text('Bank: ' + emp.bankAccount.bankName, 50, bankY + 26)
           .text('Account No: ' + emp.bankAccount.accountNo, 200, bankY + 26)
           .text('IFSC: ' + emp.bankAccount.ifsc, 400, bankY + 26)
      }

      // Signatures
      const sigY = doc.page.height - 100
      doc.fillColor('#475569').fontSize(9).font('Helvetica')
      doc.text('_______________________', 50,  sigY)
         .text('Employee Signature',      50,  sigY + 14)
      doc.text('_______________________', 400, sigY)
         .text('Authorised Signatory',    400, sigY + 14)

      // Footer
      doc.rect(0, doc.page.height - 30, 595, 30).fill('#1a2540')
      doc.fillColor('rgba(255,255,255,0.5)').fontSize(7)
         .text('This is a computer generated salary slip. Project: ' + KIPL.project.substring(0, 80), 40, doc.page.height - 20, { align: 'center' })

      doc.end()
    })
  }

  // ── RA BILL PDF ────────────────────────────────────────────
  async generateRaBill(data: {
    bill: any
    project: any
  }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = []
      const doc = new PDFDocument({ size: 'A4', margin: 40 })

      doc.on('data', chunk => chunks.push(chunk))
      doc.on('end',  () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      const { bill, project } = data

      // Header
      doc.rect(0, 0, 595, 90).fill('#1a2540')
      doc.fillColor('#fff').fontSize(14).font('Helvetica-Bold')
         .text(KIPL.name, 40, 14, { align: 'center' })
      doc.fontSize(8).font('Helvetica')
         .text(KIPL.address, 40, 32, { align: 'center' })
         .text('Tel: ' + KIPL.phone + '  |  ' + KIPL.email + '  |  ' + KIPL.website, 40, 44, { align: 'center' })

      // RA Bill title
      doc.fillColor('#f59e0b').fontSize(16).font('Helvetica-Bold')
         .text('RUNNING ACCOUNT BILL', 40, 60, { align: 'center' })

      // Bill info
      doc.fillColor('#1a2540').fontSize(10).font('Helvetica-Bold')
      const infoY = 105
      const infoData = [
        ['Bill No.',       bill.billNo],
        ['Allotment No.',  bill.allotmentNo || KIPL.allotment],
        ['Bill Date',      bill.billDate],
        ['Period',         bill.periodFrom && bill.periodTo ? bill.periodFrom + ' to ' + bill.periodTo : '—'],
        ['Status',         bill.status?.toUpperCase()],
        ['Client',         'J&K UEED Srinagar'],
      ]

      infoData.forEach(([label, val], i) => {
        const x = i < 3 ? 40 : 310
        const y = infoY + (i % 3) * 18
        doc.fillColor('#64748b').fontSize(9).font('Helvetica').text(label + ':', x, y)
        doc.fillColor('#0f172a').font('Helvetica-Bold').text(String(val || '—'), x + 90, y)
      })

      // Package
      doc.rect(40, infoY + 60, 515, 30).fill('#eff6ff')
      doc.fillColor('#1d4ed8').fontSize(8).font('Helvetica')
         .text('Package: ' + KIPL.project, 50, infoY + 68, { width: 500 })

      // Amount breakdown table
      const tableY = infoY + 105
      doc.rect(40, tableY, 515, 22).fill('#1a2540')
      doc.fillColor('#fff').fontSize(10).font('Helvetica-Bold')
         .text('BILL AMOUNT DETAILS', 50, tableY + 7)

      const rows = [
        ['Gross Amount (Executed Work)',                  bill.grossAmount,             '#f8f9fc'],
        ['Less: Previously Billed Amount',               -bill.prevBilled,             '#fff'],
        ['Net Amount This Bill',                         bill.netThisBill,             '#f8f9fc'],
        ['Add: GST (' + bill.gstPct + '%)',               bill.gstAmount,              '#fff'],
        ['Less: TDS @ ' + bill.tdsPct + '% (Clause 20)', -bill.tdsAmount,             '#f8f9fc'],
        ['Less: Security Deposit @ ' + bill.securityDepositPct + '%', -bill.securityDepositAmount, '#fff'],
      ]

      rows.forEach(([label, val, bg], i) => {
        const y = tableY + 22 + (i * 22)
        doc.rect(40, y, 515, 22).fill(String(bg))
        doc.fillColor('#374151').fontSize(9).font('Helvetica')
           .text(String(label), 50, y + 7)
        const amount = Number(val || 0)
        doc.fillColor(amount < 0 ? '#dc2626' : '#0f172a').font('Helvetica-Bold')
           .text((amount < 0 ? '- ' : '') + '₹ ' + Math.abs(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 }), 400, y + 7, { align: 'right', width: 145 })
      })

      // Net Payable
      const netY = tableY + 22 + (rows.length * 22)
      doc.rect(40, netY, 515, 35).fill('#059669')
      doc.fillColor('#fff').fontSize(13).font('Helvetica-Bold')
         .text('NET AMOUNT PAYABLE:', 50, netY + 10)
         .text('₹ ' + Number(bill.netPayable||0).toLocaleString('en-IN', { minimumFractionDigits: 2 }), 380, netY + 10, { align: 'right', width: 165 })

      // Amount in words
      doc.fillColor('#475569').fontSize(9).font('Helvetica')
         .text('In Words: ' + amountInWords(Number(bill.netPayable||0)) + ' Only', 40, netY + 45)

      // Remarks
      if (bill.remarks) {
        doc.rect(40, netY + 65, 515, 30).strokeColor('#e2e8f0').stroke()
        doc.fillColor('#475569').fontSize(9).text('Remarks: ' + bill.remarks, 50, netY + 73)
      }

      // Signatures
      const sigY = doc.page.height - 110
      doc.moveTo(40, sigY).lineTo(555, sigY).strokeColor('#e2e8f0').stroke()
      doc.fillColor('#475569').fontSize(9).font('Helvetica')
      doc.text('_______________________', 50,  sigY + 20)
         .text('Prepared By',             50,  sigY + 35)
         .text('Contractor',              50,  sigY + 48)

      doc.text('_______________________', 240, sigY + 20)
         .text('Verified By',             240, sigY + 35)
         .text('Engineer-in-Charge',      240, sigY + 48)

      doc.text('_______________________', 430, sigY + 20)
         .text('Approved By',             430, sigY + 35)
         .text('UEED / LCMA',             430, sigY + 48)

      // Footer
      doc.rect(0, doc.page.height - 30, 595, 30).fill('#1a2540')
      doc.fillColor('rgba(255,255,255,0.4)').fontSize(7)
         .text('Allotment No: ' + KIPL.allotment + '  |  Khilari Infrastructure Pvt. Ltd.  |  Generated by ProjectOS', 40, doc.page.height - 19, { align: 'center' })

      doc.end()
    })
  }

  // ── INSPECTION REPORT PDF ──────────────────────────────────
  async generateInspectionReport(data: { inspection: any; checklist?: any }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = []
      const doc = new PDFDocument({ size: 'A4', margin: 40 })

      doc.on('data', chunk => chunks.push(chunk))
      doc.on('end',  () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      const { inspection: insp, checklist } = data

      // Header
      doc.rect(0, 0, 595, 70).fill('#1a2540')
      doc.fillColor('#fff').fontSize(14).font('Helvetica-Bold')
         .text(KIPL.name, 40, 12, { align: 'center' })
      doc.fontSize(8).font('Helvetica')
         .text(KIPL.address, 40, 30, { align: 'center' })

      // Title
      doc.fillColor('#059669').fontSize(14).font('Helvetica-Bold')
         .text('QUALITY ASSURANCE INSPECTION REPORT', 40, 48, { align: 'center' })

      // Info grid
      const infoY = 85
      doc.rect(40, infoY, 515, 70).strokeColor('#e2e8f0').stroke()
      doc.fillColor('#f8f9fc').rect(40, infoY, 515, 20).fill()
      doc.fillColor('#1a2540').fontSize(9).font('Helvetica-Bold').text('INSPECTION DETAILS', 50, infoY + 6)

      const details = [
        ['Date:', insp.date, 'Work Item:', insp.workItem],
        ['Location:', insp.location || '—', 'Chainage:', insp.chainage || '—'],
        ['Inspected By:', insp.inspectedBy, 'Contractor Rep:', insp.contractorRep || '—'],
      ]
      details.forEach(([l1, v1, l2, v2], i) => {
        const y = infoY + 24 + (i * 15)
        doc.fillColor('#64748b').font('Helvetica').fontSize(8)
           .text(l1, 50, y).text(v1, 130, y)
           .text(l2, 310, y).text(v2, 400, y)
      })

      // Result summary
      const resultY = infoY + 80
      const resultColor = insp.overallResult === 'passed' ? '#059669' : insp.overallResult === 'failed' ? '#dc2626' : '#d97706'
      doc.rect(40, resultY, 515, 35).fill(resultColor)
      doc.fillColor('#fff').fontSize(12).font('Helvetica-Bold')
         .text('OVERALL RESULT: ' + insp.overallResult?.toUpperCase(), 50, resultY + 10)

      // Pass/Fail counts
      doc.fillColor('#fff').fontSize(9).font('Helvetica')
         .text('PASS: ' + insp.passCount + '   FAIL: ' + insp.failCount + '   N/A: ' + insp.naCount, 350, resultY + 14)

      // Checklist table
      const tableY = resultY + 50
      doc.rect(40, tableY, 400, 18).fill('#1a2540')
      doc.rect(440, tableY, 115, 18).fill('#1a2540')
      doc.fillColor('#fff').fontSize(9).font('Helvetica-Bold')
         .text('Inspection Item', 50, tableY + 5)
         .text('Result', 450, tableY + 5)

      const responses = insp.responses ?? []
      let rowY = tableY + 18
      responses.forEach((r: any, i: number) => {
        const rColor = r.result === 'pass' ? '#059669' : r.result === 'fail' ? '#dc2626' : '#94a3b8'
        const bg = i % 2 === 0 ? '#f8f9fc' : '#fff'
        const rowH = 20
        doc.rect(40, rowY, 400, rowH).fill(bg)
        doc.rect(440, rowY, 115, rowH).fill(r.result === 'pass' ? '#ecfdf5' : r.result === 'fail' ? '#fef2f2' : bg)
        doc.fillColor('#374151').fontSize(8).font('Helvetica')
           .text((i+1) + '. ' + r.question, 50, rowY + 6, { width: 380 })
        doc.fillColor(rColor).font('Helvetica-Bold')
           .text(r.result?.toUpperCase() ?? '—', 450, rowY + 6)
        rowY += rowH
        if (rowY > doc.page.height - 150) {
          doc.addPage()
          rowY = 40
        }
      })

      // Remarks
      if (insp.remarks) {
        doc.rect(40, rowY + 10, 515, 35).strokeColor('#e2e8f0').stroke()
        doc.fillColor('#64748b').fontSize(9).font('Helvetica')
           .text('Remarks: ' + insp.remarks, 50, rowY + 18, { width: 500 })
      }

      // Signatures
      const sigY = doc.page.height - 80
      doc.fillColor('#475569').fontSize(9)
      doc.text('_______________________', 50,  sigY).text('QA Inspector', 50, sigY + 14)
      doc.text('_______________________', 240, sigY).text('Contractor Rep', 240, sigY + 14)
      doc.text('_______________________', 430, sigY).text('Engineer-in-Charge', 430, sigY + 14)

      doc.end()
    })
  }
}

// ── Amount in words helper ─────────────────────────────────────
function amountInWords(amount: number): string {
  const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine',
    'Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen']
  const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety']

  function convert(n: number): string {
    if (n === 0) return ''
    if (n < 20) return ones[n] + ' '
    if (n < 100) return tens[Math.floor(n/10)] + ' ' + (n%10?ones[n%10]+' ':'')
    if (n < 1000) return ones[Math.floor(n/100)] + ' Hundred ' + convert(n%100)
    if (n < 100000) return convert(Math.floor(n/1000)) + 'Thousand ' + convert(n%1000)
    if (n < 10000000) return convert(Math.floor(n/100000)) + 'Lakh ' + convert(n%100000)
    return convert(Math.floor(n/10000000)) + 'Crore ' + convert(n%10000000)
  }

  const rupees = Math.floor(amount)
  const paise  = Math.round((amount - rupees) * 100)
  let words = 'Rupees ' + convert(rupees).trim()
  if (paise > 0) words += ' and ' + convert(paise).trim() + ' Paise'
  return words
}
`)
ok('pdf.service.ts — salary slip, RA bill, inspection report')

// ── PDF Controller ────────────────────────────────────────────
fs.writeFileSync(path.join(PDF, 'pdf.controller.ts'), `import { Controller, Get, Query, Res, UseGuards, NotFoundException } from '@nestjs/common'
import { Response } from 'express'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { PdfService } from './pdf.service'

@Controller('pdf')
@UseGuards(JwtAuthGuard)
export class PdfController {
  constructor(
    private readonly pdfSvc: PdfService,
  ) {}

  @Get('salary-slip')
  async salarySlip(
    @Query('employeeId') employeeId: string,
    @Query('month') month: string,
    @Query('year') year: string,
    @Res() res: Response,
  ) {
    // We'll pass mock data structure — frontend sends the data
    // Actually we fetch from DB here
    res.status(501).json({ message: 'Use POST /pdf/salary-slip with data' })
  }
}
`)

// ── Better: PDF endpoints that accept data in query + fetch from DB ─
fs.writeFileSync(path.join(PDF, 'pdf.controller.ts'), `import { Controller, Get, Post, Body, Query, Res, UseGuards } from '@nestjs/common'
import { Response } from 'express'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { PdfService } from './pdf.service'

@Controller('pdf')
@UseGuards(JwtAuthGuard)
export class PdfController {
  constructor(private readonly pdfSvc: PdfService) {}

  @Post('salary-slip')
  async salarySlip(@Body() body: any, @Res() res: Response) {
    const pdf = await this.pdfSvc.generateSalarySlip(body)
    const filename = 'SalarySlip_' + (body.employee?.empCode ?? 'EMP') + '_' + body.month + '_' + body.year + '.pdf'
    res.set({ 'Content-Type':'application/pdf', 'Content-Disposition':'attachment; filename="'+filename+'"' })
    res.send(pdf)
  }

  @Post('ra-bill')
  async raBill(@Body() body: any, @Res() res: Response) {
    const pdf = await this.pdfSvc.generateRaBill(body)
    const filename = 'RaBill_' + (body.bill?.billNo ?? 'RA') + '.pdf'
    res.set({ 'Content-Type':'application/pdf', 'Content-Disposition':'attachment; filename="'+filename+'"' })
    res.send(pdf)
  }

  @Post('inspection')
  async inspection(@Body() body: any, @Res() res: Response) {
    const pdf = await this.pdfSvc.generateInspectionReport(body)
    const filename = 'Inspection_' + (body.inspection?.date ?? 'report') + '.pdf'
    res.set({ 'Content-Type':'application/pdf', 'Content-Disposition':'attachment; filename="'+filename+'"' })
    res.send(pdf)
  }
}
`)
ok('pdf.controller.ts')

// ── PDF Module ────────────────────────────────────────────────
fs.writeFileSync(path.join(PDF, 'pdf.module.ts'), `import { Module } from '@nestjs/common'
import { PdfService } from './pdf.service'
import { PdfController } from './pdf.controller'

@Module({
  providers: [PdfService],
  controllers: [PdfController],
  exports: [PdfService],
})
export class PdfModule {}
`)
ok('pdf.module.ts')

// Register in app.module.ts
const appPath = path.join(SRC, 'app.module.ts')
let app = fs.readFileSync(appPath, 'utf8')
if (!app.includes("from './pdf/pdf.module'")) {
  app = app.replace(
    "import { MailerModule }",
    "import { PdfModule } from './pdf/pdf.module'\nimport { MailerModule }"
  )
  app = app.replace('MailerModule,', 'MailerModule,\n    PdfModule,')
  fs.writeFileSync(appPath, app)
  ok('PdfModule registered in app.module.ts')
} else { ok('Already registered') }

// ── Frontend API ──────────────────────────────────────────────
fs.writeFileSync(path.join(FSRC, 'api', 'pdf.api.ts'), `import api from './client'

// Helper: download PDF blob
async function downloadPdf(endpoint: string, data: any, filename: string) {
  const res = await api.post(endpoint, data, { responseType: 'blob' })
  const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(url)
}

export const pdfApi = {
  salarySlip: (data: {
    employee: any
    record: any
    month: number
    year: number
    daysPresent: number
    totalDays: number
  }) => downloadPdf('/api/v1/pdf/salary-slip', data,
    'SalarySlip_' + data.employee?.empCode + '_' + data.month + '_' + data.year + '.pdf'),

  raBill: (data: { bill: any; project?: any }) =>
    downloadPdf('/api/v1/pdf/ra-bill', data, 'RaBill_' + (data.bill?.billNo ?? 'RA') + '.pdf'),

  inspection: (data: { inspection: any; checklist?: any }) =>
    downloadPdf('/api/v1/pdf/inspection', data, 'Inspection_' + data.inspection?.date + '.pdf'),
}
`)
ok('pdf.api.ts — with auto-download helper')

// ── Wire PDF buttons into existing pages ──────────────────────

// 1. Salary page — add PDF button
const salaryPagePath = path.join(FSRC, 'pages', 'hr', 'SalaryPage.tsx')
if (fs.existsSync(salaryPagePath)) {
  let salary = fs.readFileSync(salaryPagePath, 'utf8')
  if (!salary.includes('pdfApi')) {
    salary = "import { pdfApi } from '@/api/pdf.api'\n" + salary
    // Add PDF button next to each salary record
    salary = salary.replace(
      "import { hrApi }",
      "import { pdfApi } from '@/api/pdf.api'\nimport { hrApi }"
    ).replace("import { pdfApi } from '@/api/pdf.api'\nimport { pdfApi } from '@/api/pdf.api'\n", "import { pdfApi } from '@/api/pdf.api'\n")
    fs.writeFileSync(salaryPagePath, salary)
    ok('SalaryPage — pdfApi imported')
  }
}

// 2. EPC page — add PDF button for RA bills
const epcPagePath = path.join(FSRC, 'pages', 'epc', 'EpcPage.tsx')
if (fs.existsSync(epcPagePath)) {
  let epc = fs.readFileSync(epcPagePath, 'utf8')
  if (!epc.includes('pdfApi')) {
    epc = "import { pdfApi } from '@/api/pdf.api'\n" + epc
    fs.writeFileSync(epcPagePath, epc)
    ok('EpcPage — pdfApi imported')
  }
}

// ── Reports Page ──────────────────────────────────────────────
fs.writeFileSync(path.join(FSRC, 'pages', 'reports', 'ReportsPage.tsx'), `import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FilePdf, Download, Receipt, ClipboardText, CheckSquare } from '@phosphor-icons/react'
import { pdfApi } from '@/api/pdf.api'
import { hrApi } from '@/api/hr.api'
import { epcApi } from '@/api/epc.api'
import { qaApi } from '@/api/qa.api'
import { useAuthStore } from '@/store/auth.store'
import { Spinner } from '@/components/ui/Spinner'

const C = {
  card:'#fff', border:'#e2e8f0', text1:'#0f172a', text2:'#475569', text3:'#94a3b8',
  blue:'#2563eb', green:'#059669', amber:'#d97706', red:'#dc2626', navy:'#1a2540',
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

export default function ReportsPage() {
  const { activeProjectId } = useAuthStore()
  const [downloading, setDownloading] = useState<string | null>(null)

  const [salaryMonth, setSalaryMonth] = useState(new Date().getMonth() + 1)
  const [salaryYear,  setSalaryYear]  = useState(new Date().getFullYear())
  const [salaryEmpId, setSalaryEmpId] = useState('')

  const { data: employees } = useQuery({
    queryKey: ['employees', activeProjectId],
    queryFn:  () => hrApi.employees({ projectId: activeProjectId, status:'active' }).then(r => r.data),
    enabled:  !!activeProjectId,
  })

  const { data: raBills } = useQuery({
    queryKey: ['ra-bills', activeProjectId],
    queryFn:  () => epcApi.raBills(activeProjectId!).then(r => r.data),
    enabled:  !!activeProjectId,
  })

  const { data: inspections } = useQuery({
    queryKey: ['qa-insp', activeProjectId],
    queryFn:  () => qaApi.inspections({ projectId: activeProjectId }).then(r => r.data),
    enabled:  !!activeProjectId,
  })

  async function downloadSalarySlip() {
    if (!salaryEmpId) return
    setDownloading('salary')
    try {
      const [empRes, salaryRes] = await Promise.all([
        hrApi.employees({ projectId: activeProjectId }),
        hrApi.salaryRecords ? hrApi.salaryRecords({ employeeId: salaryEmpId, month: salaryMonth, year: salaryYear }) : Promise.resolve({ data: [] }),
      ])
      const emp    = (empRes.data ?? []).find((e: any) => e.id === salaryEmpId)
      const record = (salaryRes.data ?? [])[0]
      if (!emp) { alert('Employee not found'); return }
      if (!record) { alert('No salary record found for this month. Generate salary first.'); return }
      await pdfApi.salarySlip({ employee: emp, record, month: salaryMonth, year: salaryYear, daysPresent: record.daysPresent ?? 26, totalDays: record.totalDays ?? 30 })
    } catch (e: any) {
      alert('Error: ' + (e?.message ?? 'Download failed'))
    } finally { setDownloading(null) }
  }

  async function downloadRaBill(bill: any) {
    setDownloading('ra-' + bill.id)
    try {
      await pdfApi.raBill({ bill })
    } finally { setDownloading(null) }
  }

  async function downloadInspection(insp: any) {
    setDownloading('insp-' + insp.id)
    try {
      await pdfApi.inspection({ inspection: insp })
    } finally { setDownloading(null) }
  }

  const years = [2025, 2026, 2027]

  return (
    <div className="fade-in" style={{ display:'flex', flexDirection:'column', gap:24 }}>

      <div>
        <h1 style={{ fontSize:24, fontWeight:800, color:C.text1, margin:0, letterSpacing:'-0.02em' }}>PDF Reports</h1>
        <p style={{ fontSize:14, color:C.text3, marginTop:4 }}>Generate and download official documents</p>
      </div>

      {/* Salary Slips */}
      <div style={{ background:C.card, borderRadius:16, border:'1.5px solid '+C.border, overflow:'hidden', boxShadow:'0 1px 6px rgba(0,0,0,0.05)' }}>
        <div style={{ padding:'16px 22px', borderBottom:'1.5px solid '+C.border, background:'#f8f9fc', display:'flex', alignItems:'center', gap:10 }}>
          <ClipboardText size={18} color={C.blue} weight="fill" />
          <h2 style={{ fontSize:15, fontWeight:700, color:C.text1, margin:0 }}>Salary Slips</h2>
        </div>
        <div style={{ padding:'20px 22px' }}>
          <div style={{ display:'flex', gap:12, alignItems:'flex-end', flexWrap:'wrap' }}>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:5 }}>Employee</label>
              <select value={salaryEmpId} onChange={e => setSalaryEmpId(e.target.value)}
                style={{ padding:'9px 13px', background:'#fff', border:'1.5px solid #d1d5db', borderRadius:8, fontSize:13, outline:'none', fontFamily:'inherit', cursor:'pointer', minWidth:220 }}>
                <option value="">Select employee...</option>
                {(employees ?? []).map((e: any) => (
                  <option key={e.id} value={e.id}>{e.empCode} — {e.firstName} {e.lastName ?? ''}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:5 }}>Month</label>
              <select value={salaryMonth} onChange={e => setSalaryMonth(parseInt(e.target.value))}
                style={{ padding:'9px 13px', background:'#fff', border:'1.5px solid #d1d5db', borderRadius:8, fontSize:13, outline:'none', fontFamily:'inherit', cursor:'pointer' }}>
                {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:5 }}>Year</label>
              <select value={salaryYear} onChange={e => setSalaryYear(parseInt(e.target.value))}
                style={{ padding:'9px 13px', background:'#fff', border:'1.5px solid #d1d5db', borderRadius:8, fontSize:13, outline:'none', fontFamily:'inherit', cursor:'pointer' }}>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <button onClick={downloadSalarySlip} disabled={!salaryEmpId || downloading === 'salary'}
              style={{ padding:'9px 20px', background:salaryEmpId?C.blue:'#e2e8f0', color:salaryEmpId?'#fff':'#94a3b8', border:'none', borderRadius:8, fontSize:13, fontWeight:600, cursor:salaryEmpId?'pointer':'not-allowed', display:'flex', alignItems:'center', gap:6 }}>
              {downloading === 'salary' ? <Spinner /> : <Download size={15}/>}
              Download PDF
            </button>
          </div>
          <p style={{ fontSize:12, color:C.text3, margin:'12px 0 0' }}>
            Select an employee, month and year. Salary must be generated first from HR → Salary.
          </p>
        </div>
      </div>

      {/* RA Bills */}
      <div style={{ background:C.card, borderRadius:16, border:'1.5px solid '+C.border, overflow:'hidden', boxShadow:'0 1px 6px rgba(0,0,0,0.05)' }}>
        <div style={{ padding:'16px 22px', borderBottom:'1.5px solid '+C.border, background:'#f8f9fc', display:'flex', alignItems:'center', gap:10 }}>
          <Receipt size={18} color={C.green} weight="fill" />
          <h2 style={{ fontSize:15, fontWeight:700, color:C.text1, margin:0 }}>Running Account Bills</h2>
        </div>
        {(raBills ?? []).length === 0 ? (
          <div style={{ padding:'32px 22px', textAlign:'center' }}>
            <p style={{ fontSize:14, color:C.text3, margin:0 }}>No RA bills yet — create them in EPC / BOQ</p>
          </div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'#f8f9fc', borderBottom:'1.5px solid '+C.border }}>
                {['Bill No.','Date','Gross Amount','Net Payable','Status','Download'].map(h => (
                  <th key={h} style={{ padding:'10px 18px', textAlign:'left', fontSize:10, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(raBills ?? []).map((b: any, i: number) => (
                <tr key={b.id} style={{ borderBottom:i<(raBills??[]).length-1?'1px solid #f1f5f9':'none' }}>
                  <td style={{ padding:'12px 18px', fontSize:13, fontWeight:700, color:C.blue, fontFamily:'monospace' }}>{b.billNo}</td>
                  <td style={{ padding:'12px 18px', fontSize:12, color:C.text2 }}>{b.billDate}</td>
                  <td style={{ padding:'12px 18px', fontSize:12, color:C.text1 }}>₹{Number(b.grossAmount).toLocaleString('en-IN')}</td>
                  <td style={{ padding:'12px 18px', fontSize:13, fontWeight:700, color:C.green }}>₹{Number(b.netPayable).toLocaleString('en-IN')}</td>
                  <td style={{ padding:'12px 18px' }}>
                    <span style={{ fontSize:10, padding:'2px 8px', borderRadius:999, fontWeight:700, background:'#f1f5f9', color:C.text2, textTransform:'uppercase' }}>{b.status}</span>
                  </td>
                  <td style={{ padding:'12px 18px' }}>
                    <button onClick={() => downloadRaBill(b)} disabled={downloading === 'ra-'+b.id}
                      style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', background:'#ecfdf5', color:'#047857', border:'1.5px solid #a7f3d0', borderRadius:6, fontSize:12, fontWeight:600, cursor:'pointer' }}>
                      {downloading === 'ra-'+b.id ? <Spinner /> : <FilePdf size={14}/>}
                      PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Inspection Reports */}
      <div style={{ background:C.card, borderRadius:16, border:'1.5px solid '+C.border, overflow:'hidden', boxShadow:'0 1px 6px rgba(0,0,0,0.05)' }}>
        <div style={{ padding:'16px 22px', borderBottom:'1.5px solid '+C.border, background:'#f8f9fc', display:'flex', alignItems:'center', gap:10 }}>
          <CheckSquare size={18} color={C.amber} weight="fill" />
          <h2 style={{ fontSize:15, fontWeight:700, color:C.text1, margin:0 }}>QA Inspection Reports</h2>
        </div>
        {(inspections ?? []).length === 0 ? (
          <div style={{ padding:'32px 22px', textAlign:'center' }}>
            <p style={{ fontSize:14, color:C.text3, margin:0 }}>No inspections yet — record them in Quality (QA)</p>
          </div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'#f8f9fc', borderBottom:'1.5px solid '+C.border }}>
                {['Date','Work Item','Location','Pass','Fail','Result','Download'].map(h => (
                  <th key={h} style={{ padding:'10px 18px', textAlign:'left', fontSize:10, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(inspections ?? []).slice(0, 20).map((insp: any, i: number) => {
                const rColor = insp.overallResult === 'passed' ? C.green : insp.overallResult === 'failed' ? C.red : C.amber
                return (
                  <tr key={insp.id} style={{ borderBottom:i<(inspections??[]).slice(0,20).length-1?'1px solid #f1f5f9':'none' }}>
                    <td style={{ padding:'11px 18px', fontSize:12, color:C.text2, whiteSpace:'nowrap' }}>{insp.date}</td>
                    <td style={{ padding:'11px 18px', fontSize:13, fontWeight:600, color:C.text1 }}>{insp.workItem}</td>
                    <td style={{ padding:'11px 18px', fontSize:12, color:C.text2 }}>{insp.location ?? '—'}</td>
                    <td style={{ padding:'11px 18px', fontSize:13, fontWeight:700, color:C.green }}>{insp.passCount}</td>
                    <td style={{ padding:'11px 18px', fontSize:13, fontWeight:700, color:insp.failCount>0?C.red:C.text3 }}>{insp.failCount}</td>
                    <td style={{ padding:'11px 18px' }}>
                      <span style={{ fontSize:10, padding:'2px 8px', borderRadius:999, fontWeight:700, background:rColor+'18', color:rColor }}>{insp.overallResult}</span>
                    </td>
                    <td style={{ padding:'11px 18px' }}>
                      <button onClick={() => downloadInspection(insp)} disabled={downloading === 'insp-'+insp.id}
                        style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', background:'#fffbeb', color:'#b45309', border:'1.5px solid #fde68a', borderRadius:6, fontSize:12, fontWeight:600, cursor:'pointer' }}>
                        {downloading === 'insp-'+insp.id ? <Spinner /> : <FilePdf size={14}/>}
                        PDF
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
`)
ok('ReportsPage.tsx — salary slips, RA bills, inspection reports')

// Add route to App.tsx
const appTsxPath = path.join(FSRC, 'App.tsx')
let appTsx = fs.readFileSync(appTsxPath, 'utf8')
if (!appTsx.includes('ReportsPage')) {
  appTsx = appTsx.replace(
    "import EmailSettingsPage",
    "import ReportsPage from '@/pages/reports/ReportsPage'\nimport EmailSettingsPage"
  )
  appTsx = appTsx.replace(
    "path='settings/email'",
    "path='reports' element={<ReportsPage />} />\n          <Route path='settings/email'"
  )
  fs.writeFileSync(appTsxPath, appTsx)
  ok('App.tsx — /reports route added')
}

// Add to Sidebar
const sidebarPath = path.join(FSRC, 'components', 'layout', 'Sidebar.tsx')
let sidebar = fs.readFileSync(sidebarPath, 'utf8')
if (!sidebar.includes("path:'/reports'")) {
  sidebar = sidebar.replace(
    "{ section:'SETTINGS'",
    "{ section:'REPORTS', label:'PDF Reports', path:'/reports', icon:FilePdf, roles:['super_admin','hr_officer','liaison_officer','accounts'] },\n  { section:'SETTINGS'"
  )
  sidebar = sidebar.replace(
    'ChartBar,',
    'ChartBar, FilePdf,'
  )
  fs.writeFileSync(sidebarPath, sidebar)
  ok('Sidebar — PDF Reports added')
}

console.log('\n\x1b[32m\x1b[1m  PDF Reports Module complete!\x1b[0m' + NC)
console.log('\n  URL: /reports')
console.log('\n  Run: cd backend && npm install  (to install pdfkit)')
console.log('\n  Available PDFs:')
console.log('  1. Salary Slips — select employee + month/year → download')
console.log('  2. RA Bills — one-click PDF for each RA bill')
console.log('  3. QA Inspection Reports — per inspection PDF with pass/fail table')
console.log('\n  All PDFs include:')
console.log('  - KIPL header with company name and address')
console.log('  - Project details (Dal Lake Allotment No.)')
console.log('  - Signature lines')
console.log('  - Official KIPL footer\n')
