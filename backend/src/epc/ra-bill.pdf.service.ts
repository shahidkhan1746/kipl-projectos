// ============================================================
//  KIPL ProjectOS — ra-bill.pdf.service.ts  v2
//  Fixes: breakup text overlap, quoted rate in Cr, est cost in Cr
// ============================================================
import { Injectable } from '@nestjs/common'
import PDFDocument from 'pdfkit'

interface SubRow { breakup: string; pct: number; amount: number }
interface LineItemPayload {
  category: string
  milestoneCode: string
  milestoneName: string
  description: string
  parentDescription: string
  workDone: string
  estimatedCost: number      // in Rupees (from BOQ totals)
  quotedRates: number        // in Rupees
  estimatedQtyKm: number     // in km (0 for lumpsum)
  measuredQtyKm: number      // in km (0 for lumpsum)
  paymentPct: number
  billToRelease: number
  workdoneAmount: number     // in Rupees
  subRows?: SubRow[]
}
interface BillHeader {
  billNo: string; billDate: string; allotmentNo: string
  allotmentDate?: string; clientRef?: string; periodFrom?: string; periodTo?: string
}
interface RaBillPayload {
  header: BillHeader
  items: LineItemPayload[]
  grossAmount: number; prevBilled: number; netThisBill: number
  gstPct: number; gstAmount: number; tdsPct: number; tdsAmount: number
  securityDepositPct: number; securityDepositAmount: number; netPayable: number
  remarks?: string
}

function toCr(rupees: number): string {
  return (rupees / 1e7).toFixed(5)
}
function toCr2(rupees: number): string {
  return (rupees / 1e7).toFixed(2)
}
function numberToWords(n: number): string {
  const a = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen']
  const b = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety']
  const cr = Math.floor(n); const lacs = Math.round((n % 1) * 100)
  let w = ''
  if (cr >= 100) w += a[Math.floor(cr/100)] + ' Hundred '
  const t = cr % 100
  if (t < 20) w += a[t]; else w += b[Math.floor(t/10)] + (t%10?' '+a[t%10]:'')
  if (cr > 0) w += ' Crore'
  if (lacs > 0) w += ' & ' + (lacs < 20 ? a[lacs] : b[Math.floor(lacs/10)] + (lacs%10?' '+a[lacs%10]:'')) + ' Lacs'
  return w.trim() + ' Only'
}

@Injectable()
export class RaBillPdfService {
  async generate(payload: RaBillPayload): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = []
      const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margins: { top: 36, bottom: 36, left: 36, right: 36 } })
      doc.on('data', (c: Buffer) => chunks.push(c))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      const W = doc.page.width     // ~841
      const MARGIN = 36
      const USABLE = W - MARGIN * 2

      const CLR = {
        navy: '#1a2540', white: '#ffffff', amber: '#b45309', amberBg: '#fef3c7',
        teal: '#0f766e', tealBg: '#f0fdfa', green: '#15803d', gray: '#6b7280',
        lightGray: '#f9fafb', border: '#e5e7eb', dark: '#1f2937', red: '#dc2626',
      }

      const drawLine = (y: number, color = CLR.border) => {
        doc.moveTo(MARGIN, y).lineTo(MARGIN + USABLE, y).strokeColor(color).lineWidth(0.5).stroke()
      }

      const fillRect = (x: number, y: number, w: number, h: number, color: string) => {
        doc.rect(x, y, w, h).fill(color).fillColor(CLR.dark)
      }

      const cellText = (
        text: string, x: number, y: number, w: number, h: number,
        opts: { align?: 'left'|'right'|'center'; bold?: boolean; color?: string; fontSize?: number; valign?: 'top'|'mid' } = {}
      ) => {
        const fs = opts.fontSize ?? 7.5
        const topPad = opts.valign === 'top' ? 3 : (h - fs) / 2
        doc.font(opts.bold ? 'Helvetica-Bold' : 'Helvetica')
           .fontSize(fs)
           .fillColor(opts.color ?? CLR.dark)
           .text(text, x + 3, y + topPad, { width: w - 6, align: opts.align ?? 'left', lineBreak: false, ellipsis: true })
      }

      // ── HEADER BLOCK ────────────────────────────────────────────────────────
      fillRect(MARGIN, 36, USABLE, 52, CLR.navy)
      doc.font('Helvetica-Bold').fontSize(15).fillColor(CLR.white)
         .text('KHILARI INFRASTRUCTURE PVT. LTD.', MARGIN + 8, 44, { width: USABLE - 16, align: 'center' })
      doc.font('Helvetica').fontSize(7.5).fillColor('#cbd5e1')
         .text('101–105, Prabhat Centre Annex, Sector-1A, C.B.D Belapur, Navi Mumbai – 400 614  |  ssk.kipl2005@gmail.com  |  www.khilariinfra.com', MARGIN + 8, 62, { width: USABLE - 16, align: 'center' })

      let y = 96
      fillRect(MARGIN, y, USABLE, 20, CLR.amberBg)
      doc.font('Helvetica-Bold').fontSize(10).fillColor(CLR.amber)
         .text('RUNNING ACCOUNT BILL', MARGIN + 8, y + 5, { width: USABLE - 16, align: 'center' })
      y += 24

      // Info grid
      const infoCols = USABLE / 4
      const infoRows = [
        [['Bill No.', payload.header.billNo], ['Allotment No.', payload.header.allotmentNo], ['Bill Date', payload.header.billDate], ['Client', 'J&K UEED Srinagar']],
        [['Contractor', 'M/S Khilari Infrastructure Pvt. Ltd.'], ['Period', payload.header.periodFrom ? payload.header.periodFrom + ' to ' + (payload.header.periodTo ?? '') : '—'], ['Ref.', payload.header.clientRef ?? 'CE/UEED/PS/01 OF 2025-26'], ['Status', 'DRAFT']],
      ]
      for (const row of infoRows) {
        for (let c = 0; c < 4; c++) {
          const [label, val] = row[c]
          doc.rect(MARGIN + c * infoCols, y, infoCols, 20).stroke(CLR.border)
          doc.font('Helvetica-Bold').fontSize(6.5).fillColor(CLR.gray).text(label, MARGIN + c * infoCols + 3, y + 2, { width: infoCols - 6 })
          doc.font('Helvetica').fontSize(7.5).fillColor(CLR.dark).text(val, MARGIN + c * infoCols + 3, y + 10, { width: infoCols - 6, ellipsis: true, lineBreak: false })
        }
        y += 20
      }

      // Package description
      fillRect(MARGIN, y, USABLE, 22, CLR.lightGray)
      doc.rect(MARGIN, y, USABLE, 22).stroke(CLR.border)
      doc.font('Helvetica').fontSize(7).fillColor(CLR.dark)
         .text('Package: Survey, Design and Execution of Sewerage Scheme for Dal Lake Uncovered Areas – Pollution Abatement of Dal Lake, Kashmir (J&K) on EPC Fixed-Cost Turnkey Basis including O&M for 5 Years after Successful Completion of 6-Month Free Trial Run', MARGIN + 5, y + 4, { width: USABLE - 10, height: 16 })
      y += 26

      // ── TABLE HEADER ────────────────────────────────────────────────────────
      // ✅ FIX #7: Column widths tuned to prevent overlap
      const COLS = {
        sno:     32,
        parent:  0,   // computed
        comp:    120,
        work:    110,
        breakup: 110,
        estCost: 62,
        quoted:  68,
        estQty:  50,
        meas:    50,
        pct:     38,
        amt:     68,
      }
      COLS.parent = USABLE - COLS.sno - COLS.comp - COLS.work - COLS.breakup - COLS.estCost - COLS.quoted - COLS.estQty - COLS.meas - COLS.pct - COLS.amt

      const HDR_H = 26
      fillRect(MARGIN, y, USABLE, HDR_H, CLR.dark)
      const headers: [string, number, 'left'|'right'|'center'][] = [
        ['S.No.', COLS.sno, 'center'],
        ['Description', COLS.parent, 'left'],
        ['Components', COLS.comp, 'left'],
        ['Work Done', COLS.work, 'left'],
        ['Breakup', COLS.breakup, 'left'],
        ['Est. Cost\n(₹ Cr)', COLS.estCost, 'right'],
        ['Quoted Rate\n(₹ Cr)', COLS.quoted, 'right'],  // ✅ FIX #8: label says Cr
        ['Est. Qty\n(Km/Nos)', COLS.estQty, 'right'],
        ['Meas.\nQty', COLS.meas, 'right'],
        ['Bill %', COLS.pct, 'center'],
        ['Amount\n(₹ Crores)', COLS.amt, 'right'],      // ✅ FIX #8: label says Crores
      ]
      let hx = MARGIN
      for (const [label, w, align] of headers) {
        doc.font('Helvetica-Bold').fontSize(6.5).fillColor(CLR.white)
           .text(label, hx + 2, y + 4, { width: w - 4, align, lineBreak: true })
        hx += w
      }
      y += HDR_H

      // ── TABLE ROWS ───────────────────────────────────────────────────────────
      const ROW_H_BASE = 16

      const drawPartHeader = (label: string): void => {
        if (y > doc.page.height - 80) {
          doc.addPage({ size: 'A4', layout: 'landscape', margins: { top: 36, bottom: 36, left: 36, right: 36 } })
          y = 36
        }
        fillRect(MARGIN, y, USABLE, 14, CLR.tealBg)
        doc.rect(MARGIN, y, USABLE, 14).stroke(CLR.border)
        doc.font('Helvetica-Bold').fontSize(8).fillColor(CLR.teal).text(label, MARGIN + 5, y + 3)
        y += 14
      }

      const drawRow = (item: LineItemPayload, sno: number): void => {
        // Calculate required height for sub-rows (breakup column)
        const subRows = item.subRows ?? []
        const baseLines = Math.max(1, Math.ceil(item.workDone.length / 22))
        const rowH = Math.max(ROW_H_BASE, subRows.length > 0 ? subRows.length * 13 + 4 : ROW_H_BASE, baseLines * 10 + 4)

        if (y + rowH > doc.page.height - 70) {
          doc.addPage({ size: 'A4', layout: 'landscape', margins: { top: 36, bottom: 36, left: 36, right: 36 } })
          y = 36
        }

        const rowBg = sno % 2 === 0 ? '#f8f9fc' : CLR.white
        fillRect(MARGIN, y, USABLE, rowH, rowBg)
        doc.rect(MARGIN, y, USABLE, rowH).stroke(CLR.border)

        let rx = MARGIN
        // S.No.
        cellText(String(sno), rx, y, COLS.sno, rowH, { align: 'center', color: CLR.gray })
        rx += COLS.sno
        // Description (parent)
        doc.font('Helvetica').fontSize(6.5).fillColor(CLR.dark)
           .text(item.parentDescription, rx + 2, y + 3, { width: COLS.parent - 4, height: rowH - 4 })
        rx += COLS.parent
        // Component
        doc.font('Helvetica-Bold').fontSize(7).fillColor(CLR.dark)
           .text(item.description, rx + 2, y + 3, { width: COLS.comp - 4, height: rowH - 4 })
        rx += COLS.comp
        // Work Done
        doc.font('Helvetica').fontSize(7).fillColor(CLR.dark)
           .text(item.workDone, rx + 2, y + 3, { width: COLS.work - 4, height: rowH - 4 })
        rx += COLS.work

        // ✅ FIX #7: Breakup — draw each sub-row on separate line
        if (subRows.length > 0) {
          let by = y + 3
          for (const sr of subRows) {
            doc.font('Helvetica').fontSize(6.5).fillColor(CLR.gray)
               .text(sr.breakup, rx + 2, by, { width: COLS.breakup - 4, lineBreak: false, ellipsis: true })
            by += 13
          }
        } else {
          cellText('—', rx, y, COLS.breakup, rowH, { align: 'center', color: CLR.gray })
        }
        rx += COLS.breakup

        // ✅ FIX #9: Est Cost — show in Crores (was showing raw rupees / wrong field)
        cellText(toCr(item.estimatedCost), rx, y, COLS.estCost, rowH, { align: 'right', color: CLR.teal })
        rx += COLS.estCost

        // ✅ FIX #8: Quoted Rate — show TOTAL in Crores (not unit rate)
        cellText(toCr(item.quotedRates), rx, y, COLS.quoted, rowH, { align: 'right', color: CLR.amber, bold: true })
        rx += COLS.quoted

        // Est Qty
        const estQtyDisplay = item.estimatedQtyKm > 0 ? item.estimatedQtyKm.toFixed(2) + ' km' : 'LS'
        cellText(estQtyDisplay, rx, y, COLS.estQty, rowH, { align: 'right', color: CLR.gray })
        rx += COLS.estQty

        // Measured Qty
        const measDisplay = item.measuredQtyKm > 0 ? item.measuredQtyKm.toFixed(2) + ' km' : 'LS'
        cellText(measDisplay, rx, y, COLS.meas, rowH, { align: 'right', color: CLR.amber })
        rx += COLS.meas

        // Billed %
        cellText(item.paymentPct.toFixed(1) + '%', rx, y, COLS.pct, rowH, { align: 'center' })
        rx += COLS.pct

        // Amount (Crores) — if has sub-rows, show each
        if (subRows.length > 0) {
          let ay = y + 3
          for (const sr of subRows) {
            doc.font('Helvetica-Bold').fontSize(7).fillColor(CLR.green)
               .text(toCr2(sr.amount), rx + 2, ay, { width: COLS.amt - 4, align: 'right', lineBreak: false })
            ay += 13
          }
          // Total for this row
          doc.font('Helvetica-Bold').fontSize(7.5).fillColor(CLR.amber)
             .text(toCr2(item.workdoneAmount), rx + 2, y + rowH - 12, { width: COLS.amt - 4, align: 'right', lineBreak: false })
        } else {
          cellText(toCr2(item.workdoneAmount), rx, y, COLS.amt, rowH, { align: 'right', color: CLR.green, bold: true })
        }

        y += rowH
      }

      // Group by part
      const partAItems = payload.items.filter(i => ['sewer_network','rcc_pipes','manholes','drop_arrangements','masonry_chambers'].includes(i.category))
      const partBItems = payload.items.filter(i => !partAItems.includes(i))

      if (partAItems.length > 0) {
        drawPartHeader('PART A — Sewer Network & Appurtenant Works (Paid per metre)')
        partAItems.forEach((item, i) => drawRow(item, i + 1))
      }
      if (partBItems.length > 0) {
        drawPartHeader("PART B — Turnkey Works (STP's / IPS's / MPS — Civil & E&M)")
        partBItems.forEach((item, i) => drawRow(item, partAItems.length + i + 1))
      }

      // Totals
      const grossCr = payload.grossAmount / 1e7
      const netCr   = payload.netThisBill / 1e7
      const netPay  = payload.netPayable / 1e7

      // Grand total row
      if (y + 20 > doc.page.height - 120) {
        doc.addPage({ size: 'A4', layout: 'landscape', margins: { top: 36, bottom: 36, left: 36, right: 36 } })
        y = 36
      }
      fillRect(MARGIN, y, USABLE, 20, CLR.dark)
      doc.font('Helvetica-Bold').fontSize(9).fillColor(CLR.white)
         .text('GROSS AMOUNT', MARGIN + 5, y + 5, { width: USABLE - COLS.amt - 10, align: 'right' })
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#fcd34d')
         .text('₹ ' + grossCr.toFixed(4) + ' Cr', MARGIN + USABLE - COLS.amt - 3, y + 4, { width: COLS.amt, align: 'right' })
      y += 24

      // Words
      fillRect(MARGIN, y, USABLE, 18, CLR.amberBg)
      doc.rect(MARGIN, y, USABLE, 18).stroke(CLR.border)
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(CLR.amber)
         .text('Total Amount in words: Rs. ' + numberToWords(grossCr), MARGIN + 5, y + 5, { width: USABLE - 10 })
      y += 22

      // Deductions table
      const dedRows: [string, string, string][] = [
        ['Less: Previously Billed Amount', '', (payload.prevBilled / 1e7).toFixed(4)],
        ['Net Amount This Bill', '', netCr.toFixed(4)],
        ['Add: GST @ ' + payload.gstPct + '%', '', (payload.gstAmount / 1e7).toFixed(4)],
        ['Less: TDS @ ' + payload.tdsPct + '% (Clause 20 of Contract)', '', (-payload.tdsAmount / 1e7).toFixed(4)],
        ['Less: Security Deposit @ ' + payload.securityDepositPct + '%', '', (-payload.securityDepositAmount / 1e7).toFixed(4)],
      ]
      for (const [label, , val] of dedRows) {
        doc.rect(MARGIN, y, USABLE, 14).stroke(CLR.border)
        doc.font('Helvetica').fontSize(8).fillColor(CLR.dark).text(label, MARGIN + 5, y + 3)
        doc.font('Helvetica-Bold').fontSize(8).fillColor(parseFloat(val) < 0 ? CLR.red : CLR.dark)
           .text(val, MARGIN + USABLE - 70, y + 3, { width: 65, align: 'right' })
        y += 14
      }

      // Net payable
      fillRect(MARGIN, y, USABLE, 22, '#ecfdf5')
      doc.rect(MARGIN, y, USABLE, 22).stroke('#a7f3d0')
      doc.font('Helvetica-Bold').fontSize(10).fillColor(CLR.dark).text('TOTAL AMOUNT PAYABLE', MARGIN + 5, y + 6)
      doc.font('Helvetica-Bold').fontSize(12).fillColor(CLR.green).text('₹ ' + netPay.toFixed(4) + ' Crores', MARGIN + USABLE - 130, y + 5, { width: 125, align: 'right' })
      y += 26

      // Amount in words (net)
      fillRect(MARGIN, y, USABLE, 18, CLR.lightGray)
      doc.rect(MARGIN, y, USABLE, 18).stroke(CLR.border)
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(CLR.green)
         .text('Total Amount in words: Rs. ' + numberToWords(netPay), MARGIN + 5, y + 5, { width: USABLE - 10 })
      y += 22

      if (payload.remarks) {
        fillRect(MARGIN, y, USABLE, 16, '#fffbeb')
        doc.rect(MARGIN, y, USABLE, 16).stroke('#fde68a')
        doc.font('Helvetica').fontSize(7.5).fillColor('#92400e').text('Remarks: ' + payload.remarks, MARGIN + 5, y + 4, { width: USABLE - 10 })
        y += 20
      }

      // Signature block
      y += 10
      const sigW = USABLE / 3
      const sigs = [
        ['Prepared by', 'Site Engineer, KIPL'],
        ['Checked by', 'Project Manager, KIPL'],
        ['Signature of the Contractor', 'M/S Khilari Infrastructure Pvt. Ltd.'],
      ]
      sigs.forEach(([label, sub], i) => {
        const sx = MARGIN + i * sigW
        doc.rect(sx, y, sigW, 44).stroke(CLR.border)
        doc.font('Helvetica').fontSize(7).fillColor(CLR.gray).text(label, sx + 5, y + 30, { width: sigW - 10 })
        doc.font('Helvetica-Bold').fontSize(7).fillColor(CLR.dark).text(sub, sx + 5, y + 38, { width: sigW - 10 })
      })
      y += 54

      // Footer
      doc.font('Helvetica').fontSize(6.5).fillColor(CLR.gray)
         .text(`KIPL ProjectOS  ·  Generated: ${new Date().toLocaleString('en-IN')}  ·  DRAFT — Not for Official Submission`, MARGIN, y, { width: USABLE, align: 'center' })

      doc.end()
    })
  }
}
