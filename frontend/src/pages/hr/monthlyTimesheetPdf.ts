import { jsPDF } from 'jspdf'

export interface MonthlyTimesheetDay {
  day: number
  dateStr: string // e.g. "1-Jul-2026"
  fullDate: string // e.g. "2026-07-01"
  activity: string
  isSunday: boolean
  isHoliday?: boolean
  status?: string
}

export interface MonthlyTimesheetPdfData {
  companyName?: string
  title?: string
  project: string
  department: string
  monthLabel: string // e.g. "July 2026"
  employeeName: string
  employeeCode?: string
  designation?: string
  days: MonthlyTimesheetDay[]
  logoDataUrl?: string | null
}

const NAVY = '#0f172a'
const ACCENT = '#1e40af'
const TEXT = '#1e293b'
const MUTED = '#64748b'
const BORDER = '#cbd5e1'
const LIGHT_BG = '#f8fafc'

// Helper to convert public/same-origin image to PNG data URL
function toDataUrl(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    if (!url) return resolve(null)
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const c = document.createElement('canvas')
        c.width = img.naturalWidth
        c.height = img.naturalHeight
        c.getContext('2d')!.drawImage(img, 0, 0)
        resolve(c.toDataURL('image/png'))
      } catch {
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
    img.src = url
  })
}

// Clean text to avoid WinAnsi glyph issues with Rupee symbol
function cleanText(str: string): string {
  if (!str) return '—'
  return str.replace(/₹/g, 'Rs. ')
}

export async function generateMonthlyTimesheetPdf(data: MonthlyTimesheetPdfData) {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = 210
  const H = 297
  const M = 14 // standard comfortable 14mm margins matching original layout
  const CW = W - 2 * M // 182mm
  const COL_DATE_W = 32 // 32mm for Date column
  const COL_ACT_W = CW - COL_DATE_W // 150mm for Site Activity column

  // Fetch logo data if not explicitly provided
  const logo = data.logoDataUrl !== undefined ? data.logoDataUrl : await toDataUrl('/assets/kipl-logo.png')

  // --- Step 1: Pre-calculate height under Standard (Comfortable) Spacing ---
  const standardFontSize = 7.8
  const standardLineHeight = 3.8
  const standardMinRowHeight = 5.8
  const standardPadding = 2.2

  let totalStandardTableHeight = 0
  const rowCalculations = data.days.map((item) => {
    const isSunday = item.isSunday || item.activity.toLowerCase() === 'sunday'
    const safeActivity = cleanText(item.activity)
    pdf.setFont('helvetica', isSunday ? 'bold' : 'normal')
    pdf.setFontSize(standardFontSize)
    const lines = pdf.splitTextToSize(safeActivity, COL_ACT_W - 8)
    const rowHeight = Math.max(standardMinRowHeight, lines.length * standardLineHeight + standardPadding)
    totalStandardTableHeight += rowHeight
    return { item, isSunday, safeActivity, lines, standardRowHeight: rowHeight }
  })

  // Table start y: 44mm (after header + metadata)
  // Signatures need: 22mm
  // Footer at: 287mm (H - 10)
  // Available table height on 1 page: 287 - 22 - 44 = 221mm
  const isTooMuchData = totalStandardTableHeight > 218

  // Condense ONLY IF the data is too much to fit comfortably on 1 page
  const fontSize = isTooMuchData ? 7.3 : standardFontSize
  const lineHeight = isTooMuchData ? 3.4 : standardLineHeight
  const minRowHeight = isTooMuchData ? 5.2 : standardMinRowHeight
  const padding = isTooMuchData ? 1.8 : standardPadding

  let y = isTooMuchData ? M - 2 : M

  const drawHeader = () => {
    const logoW = 16
    const logoH = 15
    const logoX = M
    const logoY = y

    // 0. Official KIPL Logo on the LEFT HAND SIDE (saves vertical space)
    if (logo) {
      try {
        pdf.addImage(logo, 'PNG', logoX, logoY, logoW, logoH)
      } catch {}
    }

    // 1. Company Name & Title (Centered horizontally)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(14)
    pdf.setTextColor(NAVY)
    pdf.text(data.companyName || 'KHILARI INFRASTRUCTURE PVT. LTD.', W / 2, y + 5.5, { align: 'center' })

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(11)
    pdf.setTextColor(ACCENT)
    pdf.text(data.title || 'MONTHLY TIME SHEET', W / 2, y + 11.5, { align: 'center' })

    y += Math.max(logoH, 13) + 2.5

    // Decorative line
    pdf.setDrawColor(BORDER)
    pdf.setLineWidth(0.4)
    pdf.line(M, y, W - M, y)
    y += 4

    // 2. Project & Metadata Box (Spacious 2-row layout matching original format)
    pdf.setFontSize(8.5)

    // Row 1: Project & Month
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(NAVY)
    pdf.text('Project:', M, y)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(TEXT)
    pdf.text(data.project, M + 14, y)

    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(NAVY)
    pdf.text('Month:', W - M - 40, y)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(TEXT)
    pdf.text(data.monthLabel, W - M - 26, y)
    y += 5

    // Row 2: Department & Employee Name
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(NAVY)
    pdf.text('Department:', M, y)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(TEXT)
    pdf.text(data.department, M + 21, y)

    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(NAVY)
    pdf.text('Employee Name:', W - M - 52, y)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(TEXT)
    pdf.text(data.employeeName, W - M - 26, y)
    y += 6

    // Table Header
    drawTableHeader()
  }

  const drawTableHeader = () => {
    pdf.setFillColor(NAVY)
    pdf.rect(M, y, CW, 7, 'F')

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8)
    pdf.setTextColor('#ffffff')
    pdf.text('Date', M + 4, y + 4.8)
    pdf.text('Site Activity', M + COL_DATE_W + 4, y + 4.8)

    pdf.setDrawColor(BORDER)
    pdf.setLineWidth(0.3)
    pdf.rect(M, y, CW, 7, 'S')
    pdf.line(M + COL_DATE_W, y, M + COL_DATE_W, y + 7)

    y += 7
  }

  const drawFooter = () => {
    const pageNum = pdf.getNumberOfPages()
    pdf.setDrawColor(BORDER)
    pdf.setLineWidth(0.2)
    pdf.line(M, H - 10, W - M, H - 10)

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(7)
    pdf.setTextColor(MUTED)
    pdf.text('KIPL ProjectOS — Official EPC Monthly Timesheet Proforma', M, H - 6.5)
    pdf.text(`Page ${pageNum}`, W - M, H - 6.5, { align: 'right' })
  }

  // Dual-column signature block: Employee & Project Manager (NO Client Verification)
  const drawSignatures = () => {
    const sigY = y + (isTooMuchData ? 6 : 9)
    const blockW = 65

    pdf.setDrawColor(BORDER)
    pdf.setLineWidth(0.3)

    // Sig 1: Employee Signature (Left)
    const x1 = M + 4
    pdf.line(x1, sigY + 12, x1 + blockW, sigY + 12)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8.5)
    pdf.setTextColor(NAVY)
    pdf.text('Employee Signature', x1, sigY + 16.5)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    pdf.setTextColor(MUTED)
    pdf.text(data.employeeName, x1, sigY + 21)

    // Sig 2: Project Manager / In-Charge (Right)
    const x2 = W - M - blockW - 4
    pdf.line(x2, sigY + 12, x2 + blockW, sigY + 12)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8.5)
    pdf.setTextColor(NAVY)
    pdf.text('Project Manager / In-Charge', x2, sigY + 16.5)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    pdf.setTextColor(MUTED)
    pdf.text(data.companyName || 'Khilari Infrastructure Pvt. Ltd.', x2, sigY + 21)

    y = sigY + 26
  }

  // Draw initial page header
  drawHeader()

  // Iterate over days
  for (let i = 0; i < rowCalculations.length; i++) {
    const { item, isSunday, safeActivity } = rowCalculations[i]

    // Compute text lines & height
    pdf.setFont('helvetica', isSunday ? 'bold' : 'normal')
    pdf.setFontSize(fontSize)
    const textLines = pdf.splitTextToSize(safeActivity, COL_ACT_W - 8)
    const rowHeight = isTooMuchData
      ? (textLines.length <= 1 ? 5.2 : Math.max(5.2, textLines.length * lineHeight + padding))
      : Math.max(minRowHeight, textLines.length * lineHeight + padding)

    // Only break page if row would overflow the printable page area
    if (y + rowHeight > 268) {
      drawFooter()
      pdf.addPage()
      y = M
      // On continuation page, show compact header
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(10)
      pdf.setTextColor(NAVY)
      pdf.text(`${data.companyName || 'KHILARI INFRASTRUCTURE PVT. LTD.'} — ${data.title || 'MONTHLY TIME SHEET'} (Contd.)`, M, y + 4)
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(8)
      pdf.setTextColor(MUTED)
      pdf.text(`${data.monthLabel} · ${data.employeeName}`, W - M, y + 4, { align: 'right' })
      y += 8
      drawTableHeader()
    }

    // Row Background
    if (isSunday) {
      pdf.setFillColor(LIGHT_BG)
      pdf.rect(M, y, CW, rowHeight, 'F')
    } else if (i % 2 === 1) {
      pdf.setFillColor('#ffffff')
      pdf.rect(M, y, CW, rowHeight, 'F')
    }

    // Row Borders
    pdf.setDrawColor(BORDER)
    pdf.setLineWidth(0.2)
    pdf.rect(M, y, CW, rowHeight, 'S')
    pdf.line(M + COL_DATE_W, y, M + COL_DATE_W, y + rowHeight)

    // Cell 1: Date
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(fontSize)
    pdf.setTextColor(isSunday ? MUTED : NAVY)
    pdf.text(item.dateStr, M + 3, y + (isTooMuchData ? 3.6 : 3.9))

    // Cell 2: Activity
    pdf.setFont('helvetica', isSunday ? 'bold' : 'normal')
    pdf.setFontSize(fontSize)
    pdf.setTextColor(isSunday ? MUTED : TEXT)
    pdf.text(textLines, M + COL_DATE_W + 3, y + (isTooMuchData ? 3.6 : 3.9))

    y += rowHeight
  }

  // Draw signatures
  if (y + 24 > H - 10) {
    drawFooter()
    pdf.addPage()
    y = M + 8
  }
  drawSignatures()
  drawFooter()

  const cleanName = data.employeeName.replace(/\s+/g, '_')
  const cleanMonth = data.monthLabel.replace(/\s+/g, '_')
  const fileName = `Monthly_TimeSheet_${cleanName}_${cleanMonth}.pdf`

  pdf.save(fileName)
  return pdf
}
