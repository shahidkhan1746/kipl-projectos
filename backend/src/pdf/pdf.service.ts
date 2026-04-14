import { Injectable } from '@nestjs/common'
import PDFDocument = require('pdfkit')

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

      const netY = tableY + 22 + (4 * 20) + 10
      doc.rect(40, netY, 515, 40).fill('#1a2540')
      doc.fillColor('#fff').fontSize(12).font('Helvetica-Bold')
         .text('NET PAY:', 50, netY + 12)
         .text('₹ ' + Number(rec.netSalary||0).toLocaleString('en-IN'), 400, netY + 12, { align: 'right', width: 145 })

      doc.fillColor('#475569').fontSize(8).font('Helvetica')
         .text('Amount in Words: ' + amountInWords(Number(rec.netSalary||0)) + ' Only', 40, netY + 55)

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

      const sigY = doc.page.height - 100
      doc.fillColor('#475569').fontSize(9).font('Helvetica')
      doc.text('_______________________', 50,  sigY)
         .text('Employee Signature',      50,  sigY + 14)
      doc.text('_______________________', 400, sigY)
         .text('Authorised Signatory',    400, sigY + 14)

      doc.rect(0, doc.page.height - 30, 595, 30).fill('#1a2540')
      doc.fillColor('rgba(255,255,255,0.5)').fontSize(7)
         .text('This is a computer generated salary slip. Project: ' + KIPL.project.substring(0, 80), 40, doc.page.height - 20, { align: 'center' })

      doc.end()
    })
  }

  // ── RA BILL PDF ────────────────────────────────────────────
  async generateRaBill(data: {
    bill: any
    project?: any
  }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = []
      const doc = new PDFDocument({ size: 'A4', margin: 30, layout: 'landscape' })

      doc.on('data', chunk => chunks.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      const { bill } = data
      const W = 841
      const M = 30

      doc.rect(0, 0, W, 70).fill('#1a2540')
      doc.fillColor('#ffffff').fontSize(13).font('Helvetica-Bold')
        .text(KIPL.name, M, 10, { align: 'center', width: W - M * 2 })
      doc.fontSize(8).font('Helvetica').fillColor('rgba(255,255,255,0.75)')
        .text(KIPL.address, M, 26, { align: 'center', width: W - M * 2 })
      doc.text('Tel. Fax: ' + KIPL.phone + '  |  Email: ' + KIPL.email + '  |  Website: ' + KIPL.website,
        M, 38, { align: 'center', width: W - M * 2 })

      doc.fillColor('#fbbf24').fontSize(13).font('Helvetica-Bold')
        .text('RUNNING ACCOUNT BILL', M, 52, { align: 'center', width: W - M * 2 })

      doc.rect(M, 78, W - M * 2, 22).fill('#eff6ff')
      doc.fillColor('#1d4ed8').fontSize(8).font('Helvetica')
        .text('Package: Survey, Design and Execution of Sewerage Scheme for Dal Lake Uncovered Areas -Pollution Abatement of Dal Lake Uncovered Areas, Kashmir (J&K) on EPC Fixed-Cost Turnkey Basis including Operation & Maintenance for 5 Years after Successful Completion of 6-Month Free Trial Run.',
          M + 6, 83, { width: W - M * 2 - 12 })

      const infoY = 108
      doc.rect(M, infoY, W - M * 2, 28).strokeColor('#e2e8f0').lineWidth(0.5).stroke()

      doc.fillColor('#475569').fontSize(8).font('Helvetica')
      doc.text('Bill No:', M + 6, infoY + 4)
      doc.fillColor('#0f172a').font('Helvetica-Bold')
        .text(bill.billNo ?? 'RA-1', M + 50, infoY + 4)

      doc.fillColor('#475569').font('Helvetica')
        .text('Allotment No:', M + 6, infoY + 14)
      doc.fillColor('#0f172a').font('Helvetica-Bold')
        .text(bill.allotmentNo ?? KIPL.allotment, M + 65, infoY + 14)

      const midX = M + 240
      doc.fillColor('#475569').font('Helvetica')
        .text('Dated:', midX, infoY + 4)
      doc.fillColor('#0f172a').font('Helvetica-Bold')
        .text(bill.billDate ?? '', midX + 40, infoY + 4)

      doc.fillColor('#475569').font('Helvetica')
        .text('Client:', midX, infoY + 14)
      doc.fillColor('#0f172a').font('Helvetica-Bold')
        .text('J&K UEED Srinagar.', midX + 35, infoY + 14)

      const rightX = M + 480
      doc.fillColor('#475569').font('Helvetica')
        .text('Contractor:', rightX, infoY + 4)
      doc.fillColor('#0f172a').font('Helvetica-Bold')
        .text(KIPL.name, rightX + 55, infoY + 4)

      if (bill.periodFrom && bill.periodTo) {
        doc.fillColor('#475569').font('Helvetica')
          .text('Period:', rightX, infoY + 14)
        doc.fillColor('#0f172a').font('Helvetica-Bold')
          .text(bill.periodFrom + ' to ' + bill.periodTo, rightX + 35, infoY + 14)
      }

      const tableY = infoY + 35
      const cols = {
        sno: M,
        desc: M + 28,
        comp: M + 180,
        workdone: M + 310,
        breakup: M + 390,
        estCost: M + 475,
        quotedRates: M + 515,
        estQty: M + 557,
        measQty: M + 595,
        pctBill: M + 633,
        billRelease: M + 663,
        amount: M + 695,
      }

      doc.rect(M, tableY, W - M * 2, 22).fill('#1a2540')
      doc.fillColor('#fff').fontSize(6.5).font('Helvetica-Bold')
      const headers = [
        [cols.sno, 'S.No'],
        [cols.desc, 'Description'],
        [cols.comp, 'Components'],
        [cols.workdone, 'Work Done'],
        [cols.breakup, 'Breakup'],
        [cols.estCost, 'Estimated\nCost,cr'],
        [cols.quotedRates, 'Quoted\nRates,cr'],
        [cols.estQty, 'Est. Qty\n(Km/Nos)'],
        [cols.measQty, 'Meas.\nQty'],
        [cols.pctBill, '% of Bill\n(Payment Sch.)'],
        [cols.billRelease, 'Workdone\nBill Released'],
        [cols.amount, 'Workdone\nAmount,cr'],
      ]
      headers.forEach(([x, label]) => {
        doc.text(String(label), Number(x), tableY + 3, { width: 36, align: 'center' })
      })

      const lineItems: any[] = bill.lineItems ?? []
      let rowY = tableY + 22
      let sno = 1

      const grouped: Record<string, any[]> = {}
      for (const li of lineItems) {
        if (!grouped[li.category]) grouped[li.category] = []
        grouped[li.category].push(li)
      }

      const drawVLines = (y: number, h: number) => {
        doc.strokeColor('#e2e8f0').lineWidth(0.3)
        Object.values(cols).forEach(x => {
          doc.moveTo(x, y).lineTo(x, y + h).stroke()
        })
        doc.moveTo(W - M, y).lineTo(W - M, y + h).stroke()
      }

      for (const [cat, items] of Object.entries(grouped)) {
        const catH = 14
        doc.rect(M, rowY, W - M * 2, catH).fill('#f0f4ff')
        doc.fillColor('#1e40af').fontSize(7).font('Helvetica-Bold')
          .text(String(sno) + '.', cols.sno, rowY + 4, { width: 22, align: 'center' })
          .text(getCategoryDescription(cat), cols.desc, rowY + 4, { width: 110 })
        drawVLines(rowY, catH)
        doc.moveTo(M, rowY + catH).lineTo(W - M, rowY + catH).strokeColor('#d1d5db').lineWidth(0.3).stroke()
        rowY += catH

        for (const li of items) {
          const rowH = 20
          const bg = rowY % 2 === 0 ? '#ffffff' : '#f9fafb'
          doc.rect(M, rowY, W - M * 2, rowH).fill(bg)
          doc.fillColor('#374151').fontSize(6.5).font('Helvetica')
          doc.text(getComponentName(cat), cols.comp, rowY + 4, { width: 125, lineBreak: false })
          doc.text(li.milestoneName, cols.workdone, rowY + 4, { width: 75, lineBreak: false })
          doc.text('Clause 23.3 @' + li.paymentPct + '%', cols.breakup, rowY + 4, { width: 80, lineBreak: false })
          doc.text(fmtCrNum(li.estimatedCost), cols.estCost, rowY + 4, { width: 36, align: 'right' })
          doc.text(fmtCrNum(li.quotedRates), cols.quotedRates, rowY + 4, { width: 38, align: 'right' })
          doc.text(li.estimatedQtyKm > 0 ? li.estimatedQtyKm.toFixed(2) : '—', cols.estQty, rowY + 4, { width: 34, align: 'right' })
          doc.text(li.measuredQtyKm > 0 ? li.measuredQtyKm.toFixed(2) : '—', cols.measQty, rowY + 4, { width: 34, align: 'right' })
          doc.text(li.paymentPct + '%', cols.pctBill, rowY + 4, { width: 28, align: 'center' })
          doc.text(li.billToRelease.toFixed(1) + '%', cols.billRelease, rowY + 4, { width: 28, align: 'center' })
          doc.fillColor('#047857').font('Helvetica-Bold')
            .text(fmtCrNum(li.workdoneAmount), cols.amount, rowY + 4, { width: 44, align: 'right' })
          drawVLines(rowY, rowH)
          doc.moveTo(M, rowY + rowH).lineTo(W - M, rowY + rowH).strokeColor('#e2e8f0').lineWidth(0.3).stroke()
          rowY += rowH
        }

        sno++
        if (rowY > 510) {
          doc.addPage({ layout: 'landscape' })
          rowY = 40
        }
      }

      const totalH = 20
      doc.rect(M, rowY, W - M * 2, totalH).fill('#1a2540')
      doc.fillColor('#fff').fontSize(9).font('Helvetica-Bold')
        .text('GROSS AMOUNT', cols.sno, rowY + 6, { width: 460 })
        .text(fmtCrNum(Number(bill.grossAmount ?? 0)), cols.amount, rowY + 6, { width: 44, align: 'right' })
      drawVLines(rowY, totalH)
      rowY += totalH

      const dedRows = [
        ['Less: Previously Billed Amount', Number(bill.prevBilled ?? 0), false],
        ['Net Amount This Bill', Number(bill.netThisBill ?? 0), false],
        ['Add: GST @ ' + (bill.gstPct ?? 0) + '%', Number(bill.gstAmount ?? 0), false],
        ['Less: TDS @ ' + (bill.tdsPct ?? 2) + '% (Clause 20)', Number(bill.tdsAmount ?? 0), true],
        ['Less: Security Deposit @ ' + (bill.securityDepositPct ?? 5) + '%', Number(bill.securityDepositAmount ?? 0), true],
      ]
      dedRows.forEach(([label, val, isDeduction]: any) => {
        const dH = 15
        doc.rect(M, rowY, W - M * 2, dH).fill(rowY % 2 === 0 ? '#f9fafb' : '#fff')
        doc.fillColor('#374151').fontSize(8).font('Helvetica')
          .text(String(label), cols.sno, rowY + 4, { width: 560 })
        doc.fillColor(isDeduction ? '#dc2626' : '#0f172a').font('Helvetica-Bold')
          .text((isDeduction ? '- ' : '') + fmtCrNum(Math.abs(Number(val))), cols.amount, rowY + 4, { width: 44, align: 'right' })
        doc.moveTo(M, rowY + dH).lineTo(W - M, rowY + dH).strokeColor('#e2e8f0').lineWidth(0.3).stroke()
        rowY += dH
      })

      const npH = 24
      doc.rect(M, rowY, W - M * 2, npH).fill('#059669')
      doc.fillColor('#fff').fontSize(11).font('Helvetica-Bold')
        .text('NET AMOUNT PAYABLE', cols.sno, rowY + 7, { width: 460 })
        .text(fmtCrNum(Number(bill.netPayable ?? 0)), cols.amount, rowY + 7, { width: 44, align: 'right' })
      rowY += npH + 6

      doc.fillColor('#374151').fontSize(8).font('Helvetica')
        .text('Total Amount in words: ' + amountInWords(Number(bill.netPayable ?? 0)) + ' Only', M, rowY)
      rowY += 16

      const statusColor = bill.status === 'approved' || bill.status === 'paid' ? '#059669' :
        bill.status === 'submitted' ? '#2563eb' : '#64748b'
      doc.rect(M, rowY, 100, 16).fill(statusColor + '20')
      doc.fillColor(statusColor).fontSize(8).font('Helvetica-Bold')
        .text('STATUS: ' + (bill.status ?? 'DRAFT').toUpperCase(), M + 6, rowY + 4)
      rowY += 28

      const sigLineY = rowY + 2
      const sigPositions = [
        [M, 'Prepared By', 'Contractor'],
        [M + 200, 'Checked By', 'Site Engineer'],
        [M + 400, 'Verified By', 'Engineer-in-Charge'],
        [M + 600, 'Approved By', 'UEED / LCMA'],
      ]
      doc.fillColor('#374151').fontSize(8).font('Helvetica')
      sigPositions.forEach(([x, role, org]) => {
        doc.moveTo(Number(x), sigLineY + 18).lineTo(Number(x) + 150, sigLineY + 18)
          .strokeColor('#94a3b8').lineWidth(0.5).stroke()
        doc.text(String(role), Number(x), sigLineY + 20)
        doc.fillColor('#94a3b8').fontSize(7).text(String(org), Number(x), sigLineY + 30)
        doc.fillColor('#374151').fontSize(8)
      })

      if (bill.remarks) {
        rowY += 54
        doc.rect(M, rowY, W - M * 2, 20).strokeColor('#fde68a').stroke()
        doc.rect(M, rowY, W - M * 2, 20).fill('#fffbeb')
        doc.fillColor('#92400e').fontSize(8).font('Helvetica')
          .text('Remarks: ' + bill.remarks, M + 6, rowY + 6)
      }

      doc.rect(0, 570, W, 25).fill('#1a2540')
      doc.fillColor('rgba(255,255,255,0.45)').fontSize(7).font('Helvetica')
        .text('Allotment No: ' + KIPL.allotment + '  ·  ' + KIPL.name + '  ·  Generated by KIPL ProjectOS  ·  ' + new Date().toLocaleDateString('en-IN'),
          M, 578, { align: 'center', width: W - M * 2 })

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

      doc.rect(0, 0, 595, 70).fill('#1a2540')
      doc.fillColor('#fff').fontSize(14).font('Helvetica-Bold')
         .text(KIPL.name, 40, 12, { align: 'center' })
      doc.fontSize(8).font('Helvetica')
         .text(KIPL.address, 40, 30, { align: 'center' })

      doc.fillColor('#059669').fontSize(14).font('Helvetica-Bold')
         .text('QUALITY ASSURANCE INSPECTION REPORT', 40, 48, { align: 'center' })

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

      const resultY = infoY + 80
      const resultColor = insp.overallResult === 'passed' ? '#059669' : insp.overallResult === 'failed' ? '#dc2626' : '#d97706'
      doc.rect(40, resultY, 515, 35).fill(resultColor)
      doc.fillColor('#fff').fontSize(12).font('Helvetica-Bold')
         .text('OVERALL RESULT: ' + insp.overallResult?.toUpperCase(), 50, resultY + 10)

      doc.fillColor('#fff').fontSize(9).font('Helvetica')
         .text('PASS: ' + insp.passCount + '   FAIL: ' + insp.failCount + '   N/A: ' + insp.naCount, 350, resultY + 14)

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

      if (insp.remarks) {
        doc.rect(40, rowY + 10, 515, 35).strokeColor('#e2e8f0').stroke()
        doc.fillColor('#64748b').fontSize(9).font('Helvetica')
           .text('Remarks: ' + insp.remarks, 50, rowY + 18, { width: 500 })
      }

      const sigY = doc.page.height - 80
      doc.fillColor('#475569').fontSize(9)
      doc.text('_______________________', 50,  sigY).text('QA Inspector', 50, sigY + 14)
      doc.text('_______________________', 240, sigY).text('Contractor Rep', 240, sigY + 14)
      doc.text('_______________________', 430, sigY).text('Engineer-in-Charge', 430, sigY + 14)

      doc.end()
    })
  }

} // ← END OF CLASS

// ── Helper functions (outside class) ──────────────────────────

function fmtCrNum(n: number): string {
  return (n / 1e7).toFixed(5)
}

function getCategoryDescription(cat: string): string {
  const map: Record<string, string> = {
    sewer_network: 'Laying of Sewer & Appurtenant works (Survey, Design, Providing & Laying of Sewerage Network including Excavation)',
    ips_civil: 'For IPS — Civil & Structural Works (Turnkey Items)',
    ips_em: 'For IPS — Electro-Mechanical Works (Turnkey Items)',
    stp_civil: 'For STP/MPS — Civil & Structural Works (Turnkey Items)',
    stp_em: 'For STP/MPS — Electro-Mechanical Works (Turnkey Items)',
    rising_main: 'Rising Mains & Allied Works (Turnkey Items)',
    road_work: 'Road Cutting, Reinstatement & Surface Restoration',
    other: 'Miscellaneous Works',
  }
  return map[cat] ?? cat
}

function getComponentName(cat: string): string {
  const map: Record<string, string> = {
    sewer_network: 'RCC NP3 Pipes of all dia incl. DI, HDPE; Manholes of Different Sizes & Depths; Drop Arrangements; Masonry Chambers',
    ips_civil: 'Survey Design, engineering, supply, construction, erection, hydraulic testing and commissioning of IPS (Civil)',
    ips_em: 'Survey Design, engineering, supply, construction, erection, hydraulic testing and commissioning of IPS (E&M)',
    stp_civil: 'Survey Design, engineering, supply, construction, erection, hydraulic testing and commissioning of STP/MPS (Civil)',
    stp_em: 'Survey Design, engineering, supply, erection and commissioning of STP/MPS Electro-Mechanical Components',
    rising_main: 'Rising Main Pipes, Valves, Fittings and Allied Civil Works',
    road_work: 'Cutting bitumen road and making good including supply of aggregate, moorum, screening etc.',
    other: 'Miscellaneous works as per BOQ',
  }
  return map[cat] ?? cat
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
