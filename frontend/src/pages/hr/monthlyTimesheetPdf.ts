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

// Helper to convert same-origin / public image to PNG data URL
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

export async function generateMonthlyTimesheetPdf(data: MonthlyTimesheetPdfData) {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = 210
  const H = 297
  const M = 14
  const CW = W - 2 * M // 182mm
  const COL_DATE_W = 32
  const COL_ACT_W = CW - COL_DATE_W // 150mm

  // Fetch logo data if not explicitly provided
  const logo = data.logoDataUrl !== undefined ? data.logoDataUrl : await toDataUrl('/assets/kipl-logo.png')

  let y = M - 3

  const drawHeader = () => {
    // 0. Official KIPL Logo at Top Center
    if (logo) {
      try {
        const logoH = 14
        const logoW = 15 // aspect ratio ~ 1.074
        const logoX = (W - logoW) / 2
        pdf.addImage(logo, 'PNG', logoX, y, logoW, logoH)
        y += logoH + 2.5
      } catch {}
    } else {
      y += 2
    }

    // 1. Company Name
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(13.5)
    pdf.setTextColor(NAVY)
    pdf.text(data.companyName || 'KHILARI INFRASTRUCTURE PVT. LTD.', W / 2, y, { align: 'center' })
    y += 5

    // 2. Form Title
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(10.5)
    pdf.setTextColor(ACCENT)
    pdf.text(data.title || 'MONTHLY TIME SHEET', W / 2, y, { align: 'center' })
    y += 4.5

    // Decorative line
    pdf.setDrawColor(BORDER)
    pdf.setLineWidth(0.4)
    pdf.line(M, y, W - M, y)
    y += 4

    // 3. Project & Metadata Box
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
    const sigY = y + 8
    const blockW = 68 // ample signature width

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

    y = sigY + 28
  }

  // Draw initial page header
  drawHeader()

  // Iterate over days
  for (let i = 0; i < data.days.length; i++) {
    const item = data.days[i]
    const isSunday = item.isSunday || item.activity.toLowerCase() === 'sunday'

    // Compute text height
    pdf.setFont('helvetica', isSunday ? 'bold' : 'normal')
    pdf.setFontSize(7.8)
    const textLines = pdf.splitTextToSize(item.activity || '—', COL_ACT_W - 8)
    const rowHeight = Math.max(5.8, textLines.length * 3.8 + 2.2)

    // Check if new page is needed (leaving room for row + signatures if at end)
    const isLastFew = i >= data.days.length - 2
    const neededSpace = isLastFew ? rowHeight + 35 : rowHeight + 14

    if (y + neededSpace > H - 12) {
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
    pdf.setFont('helvetica', isSunday ? 'bold' : 'bold')
    pdf.setFontSize(7.5)
    pdf.setTextColor(isSunday ? MUTED : NAVY)
    pdf.text(item.dateStr, M + 3, y + 3.8)

    // Cell 2: Activity
    pdf.setFont('helvetica', isSunday ? 'bold' : 'normal')
    pdf.setFontSize(7.5)
    pdf.setTextColor(isSunday ? MUTED : TEXT)
    pdf.text(textLines, M + COL_DATE_W + 3, y + 3.8)

    y += rowHeight
  }

  // Draw signatures on the last page
  if (y + 30 > H - 12) {
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
