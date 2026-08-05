import { jsPDF } from 'jspdf'

// Employee ID card (portrait, 60 × 96 mm — lanyard size), client-side jsPDF.
const NAVY = '#0a1e28', AQUA = '#2FB98C', MUTED = '#6b8592'

// Load a same-origin or CORS-enabled image → JPEG data URL (null on failure).
function toDataUrl(url: string): Promise<string | null> {
  return new Promise(resolve => {
    if (!url) return resolve(null)
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight
        c.getContext('2d')!.drawImage(img, 0, 0)
        resolve(c.toDataURL('image/jpeg', 0.9))
      } catch { resolve(null) }
    }
    img.onerror = () => resolve(null)
    img.src = url
  })
}

export async function generateIdCard(emp: any) {
  const W = 60, H = 96
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [W, H] })
  const name = `${emp.firstName ?? ''} ${emp.lastName ?? ''}`.trim()

  // Card border
  pdf.setDrawColor('#cbd5e1'); pdf.setLineWidth(0.3); pdf.roundedRect(1, 1, W - 2, H - 2, 3, 3)

  // Header band
  pdf.setFillColor(NAVY); pdf.rect(1, 1, W - 2, 17, 'F')
  const logo = await toDataUrl('/assets/kipl-logo.png')
  if (logo) { try { pdf.addImage(logo, 'PNG', 4, 3.5, 11, 11) } catch {} }
  pdf.setTextColor('#ffffff'); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11)
  pdf.text('KIPL', logo ? 17 : 5, 8)
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(5.6); pdf.setTextColor('#9DB4C6')
  pdf.text('Khilari Infrastructure Pvt. Ltd.', logo ? 17 : 5, 12)
  pdf.setTextColor(AQUA); pdf.setFontSize(5.4)
  pdf.text('Dal Lake STP · Nishat, Srinagar', logo ? 17 : 5, 15.5)

  // Photo
  const photo = await toDataUrl(emp.photoUrl)
  const px = (W - 26) / 2, py = 22
  pdf.setDrawColor(AQUA); pdf.setLineWidth(0.5); pdf.roundedRect(px, py, 26, 30, 2, 2)
  if (photo) { try { pdf.addImage(photo, 'JPEG', px + 0.6, py + 0.6, 24.8, 28.8) } catch {} }
  else { pdf.setFillColor('#eef3f0'); pdf.roundedRect(px + 0.6, py + 0.6, 24.8, 28.8, 2, 2, 'F'); pdf.setTextColor(MUTED); pdf.setFontSize(6); pdf.text('PHOTO', W / 2, py + 16, { align: 'center' }) }

  // Name + designation
  let y = py + 37
  pdf.setTextColor(NAVY); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11)
  pdf.text(pdf.splitTextToSize(name || '—', W - 8), W / 2, y, { align: 'center' })
  y += 4.5
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7); pdf.setTextColor(AQUA)
  pdf.text(emp.designation ?? '—', W / 2, y, { align: 'center' })

  // Details
  y += 6
  const rows: [string, string][] = [
    ['ID No.', emp.empCode ?? '—'],
    ['Department', emp.department ?? '—'],
    ['Phone', emp.phone ?? '—'],
    ['DOJ', emp.dateOfJoining ? String(emp.dateOfJoining).split('T')[0] : '—'],
  ]
  if (emp.bloodGroup) rows.push(['Blood Group', emp.bloodGroup])
  pdf.setFontSize(6.6)
  rows.forEach(r => {
    pdf.setFont('helvetica', 'bold'); pdf.setTextColor(MUTED); pdf.text(r[0], 6, y)
    pdf.setFont('helvetica', 'normal'); pdf.setTextColor('#0f172a'); pdf.text(String(r[1]), 24, y)
    y += 4
  })

  // Footer band
  pdf.setFillColor(NAVY); pdf.rect(1, H - 11, W - 2, 10, 'F')
  pdf.setTextColor('#9DB4C6'); pdf.setFontSize(5); pdf.setFont('helvetica', 'normal')
  pdf.text('If found, return to KIPL site office, Nishat, Srinagar', W / 2, H - 7, { align: 'center' })
  pdf.setDrawColor('#3b556380'); pdf.line(W - 26, H - 4.5, W - 5, H - 4.5)
  pdf.setTextColor('#c3d4e0'); pdf.setFontSize(4.6)
  pdf.text('Authorised Signatory', W - 15.5, H - 2.6, { align: 'center' })

  pdf.save(`KIPL-ID-${emp.empCode ?? 'employee'}.pdf`)
}
