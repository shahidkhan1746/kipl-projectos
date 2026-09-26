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
  const M = 11 // 11mm margins maximize printable area
  const CW = W - 2 * M // 188mm
  const COL_DATE_W = 28 // 28mm for Date
  const COL_ACT_W = CW - COL_DATE_W // 160mm for Activity (wide enough to minimize text wrapping)

  // Fetch logo data if not explicitly provided
  const logo = data.logoDataUrl !== undefined ? data.logoDataUrl : await toDataUrl('/assets/kipl-logo.png')

  let y = M - 1

  const drawHeader = () => {
    const logoW = 15.5
    const logoH = 14.5
    const logoX = M
    const logoY = y

    // 0. Official KIPL Logo on the LEFT HAND SIDE (saves ~18mm vertical height)
    if (logo) {
      try {
        pdf.addImage(logo, 'PNG', logoX, logoY, logoW, logoH)
      } catch {}
    }

    // 1. Company Name & Title (Aligned horizontally with logo)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(13.5)
    pdf.setTextColor(NAVY)
    pdf.text(data.companyName || 'KHILARI INFRASTRUCTURE PVT. LTD.', W / 2, y + 5.5, { align: 'center' })

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(10)
    pdf.setTextColor(ACCENT)
    pdf.text(data.title || 'MONTHLY TIME SHEET', W / 2, y + 11.2, { align: 'center' })

    y += Math.max(logoH, 12) + 2

    // Decorative line
    pdf.setDrawColor(BORDER)
    pdf.setLineWidth(0.3)
    pdf.line(M, y, W - M, y)
    y += 3.5

    // 2. Project & Metadata Box (Compact 2-row layout)
    pdf.setFontSize(8)

    // Row 1: Project & Month
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(NAVY)
    pdf.text('Project:', M, y)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(TEXT)
    pdf.text(data.project, M + 13, y)

    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(NAVY)
    pdf.text('Month:', W - M - 36, y)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(TEXT)
    pdf.text(data.monthLabel, W - M - 24, y)
    y += 4.5

    // Row 2: Department & Employee Name
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(NAVY)
    pdf.text('Department:', M, y)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(TEXT)
    pdf.text(data.department, M + 19, y)

    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(NAVY)
    pdf.text('Employee Name:', W - M - 48, y)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(TEXT)
    pdf.text(data.employeeName, W - M - 24, y)
    y += 5.5

    // Table Header
    drawTableHeader()
  }

  const drawTableHeader = () => {
    pdf.setFillColor(NAVY)
    pdf.rect(M, y, CW, 6.2, 'F')

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(7.8)
    pdf.setTextColor('#ffffff')
    pdf.text('Date', M + 3, y + 4.3)
    pdf.text('Site Activity', M + COL_DATE_W + 3, y + 4.3)

    pdf.setDrawColor(BORDER)
    pdf.setLineWidth(0.3)
    pdf.rect(M, y, CW, 6.2, 'S')
    pdf.line(M + COL_DATE_W, y, M + COL_DATE_W, y + 6.2)

    y += 6.2
  }

  const drawFooter = () => {
    const pageNum = pdf.getNumberOfPages()
    pdf.setDrawColor(BORDER)
    pdf.setLineWidth(0.2)
    pdf.line(M, H - 8, W - M, H - 8)

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(6.8)
    pdf.setTextColor(MUTED)
    pdf.text('KIPL ProjectOS — Official EPC Monthly Timesheet Proforma', M, H - 5)
    pdf.text(`Page ${pageNum}`, W - M, H - 5, { align: 'right' })
  }

  // Dual-column signature block: Employee & Project Manager (NO Client Verification)
  const drawSignatures = () => {
    const sigY = y + 5
    const blockW = 65

    pdf.setDrawColor(BORDER)
    pdf.setLineWidth(0.3)

    // Sig 1: Employee Signature (Left)
    const x1 = M + 2
    pdf.line(x1, sigY + 10, x1 + blockW, sigY + 10)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8)
    pdf.setTextColor(NAVY)
    pdf.text('Employee Signature', x1, sigY + 14)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(7.5)
    pdf.setTextColor(MUTED)
    pdf.text(data.employeeName, x1, sigY + 18)

    // Sig 2: Project Manager / In-Charge (Right)
    const x2 = W - M - blockW - 2
    pdf.line(x2, sigY + 10, x2 + blockW, sigY + 10)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8)
    pdf.setTextColor(NAVY)
    pdf.text('Project Manager / In-Charge', x2, sigY + 14)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(7.5)
    pdf.setTextColor(MUTED)
    pdf.text(data.companyName || 'Khilari Infrastructure Pvt. Ltd.', x2, sigY + 18)

    y = sigY + 22
  }

  // Draw initial page header
  drawHeader()

  // Iterate over days
  for (let i = 0; i < data.days.length; i++) {
    const item = data.days[i]
    const isSunday = item.isSunday || item.activity.toLowerCase() === 'sunday'

    // Compute text height
    pdf.setFont('helvetica', isSunday ? 'bold' : 'normal')
    pdf.setFontSize(7.4)
    const textLines = pdf.splitTextToSize(item.activity || '—', COL_ACT_W - 6)
    const rowHeight = textLines.length <= 1 ? 5.1 : Math.max(5.1, textLines.length * 3.3 + 1.8)

    // Only break page if row would overflow the printable page area
    if (y + rowHeight > 268) {
      drawFooter()
      pdf.addPage()
      y = M
      // On continuation page, show compact header
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(9.5)
      pdf.setTextColor(NAVY)
      pdf.text(`${data.companyName || 'KHILARI INFRASTRUCTURE PVT. LTD.'} — ${data.title || 'MONTHLY TIME SHEET'} (Contd.)`, M, y + 4)
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(7.5)
      pdf.setTextColor(MUTED)
      pdf.text(`${data.monthLabel} · ${data.employeeName}`, W - M, y + 4, { align: 'right' })
      y += 7
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
    pdf.setFontSize(7.2)
    pdf.setTextColor(isSunday ? MUTED : NAVY)
    pdf.text(item.dateStr, M + 2.5, y + 3.5)

    // Cell 2: Activity
    pdf.setFont('helvetica', isSunday ? 'bold' : 'normal')
    pdf.setFontSize(7.2)
    pdf.setTextColor(isSunday ? MUTED : TEXT)
    pdf.text(textLines, M + COL_DATE_W + 2.5, y + 3.5)

    y += rowHeight
  }

  // Draw signatures
  if (y + 20 > H - 10) {
    drawFooter()
    pdf.addPage()
    y = M + 6
  }
  drawSignatures()
  drawFooter()

  const cleanName = data.employeeName.replace(/\s+/g, '_')
  const cleanMonth = data.monthLabel.replace(/\s+/g, '_')
  const fileName = `Monthly_TimeSheet_${cleanName}_${cleanMonth}.pdf`

  pdf.save(fileName)
  return pdf
}
