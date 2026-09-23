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
  if (emp.emergencyName || emp.emergencyPhone) rows.push(['Emergency', `${emp.emergencyName ?? ''}${emp.emergencyPhone ? ' · ' + emp.emergencyPhone : ''}`])
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

  // ── Back of Card ──
  pdf.addPage([W, H], 'portrait')

  // Back card border
  pdf.setDrawColor('#cbd5e1'); pdf.setLineWidth(0.3); pdf.roundedRect(1, 1, W - 2, H - 2, 3, 3)

  // Back header band
  pdf.setFillColor(NAVY); pdf.rect(1, 1, W - 2, 14, 'F')
  if (logo) { try { pdf.addImage(logo, 'PNG', 4, 2.5, 9, 9) } catch {} }
  pdf.setTextColor('#ffffff'); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8.5)
  pdf.text('KHILARI INFRASTRUCTURE', logo ? 15 : 5, 6.5)
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(5.2); pdf.setTextColor(AQUA)
  pdf.text('Engineers | Contractors | Solutions', logo ? 15 : 5, 10.5)

  // Terms & Conditions
  let by = 20
  pdf.setTextColor(NAVY); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(6.8)
  pdf.text('TERMS & CONDITIONS', 5, by)
  by += 4
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(5.2); pdf.setTextColor('#334155')
  pdf.text('• Carry this ID Card at all times during working hours.', 5, by)
  by += 3.5
  pdf.text('• Strictly for official identification; non-transferable.', 5, by)
  by += 3.5
  pdf.text('• Property of KIPL. Must be returned upon cessation.', 5, by)

  // Project Office
  by += 7
  pdf.setTextColor(NAVY); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(6.8)
  pdf.text('PROJECT SITE OFFICE', 5, by)
  by += 4
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(5.2); pdf.setTextColor('#334155')
  const officeLines = pdf.splitTextToSize('38.5 MLD STP, Near LCMA Enforcement Office, Lashkari Mohalla, ISHBER Nishat, Srinagar - 191121', W - 10)
  pdf.text(officeLines, 5, by)

  // Government affiliation
  by += 10
  pdf.setTextColor(MUTED); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(5.2)
  pdf.text('Working in association with:', 5, by)
  by += 3.2
  pdf.setTextColor(NAVY); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(4.8)
  pdf.text('UEED, Govt. of J&K · AMRUT Scheme, Govt. of India', 5, by)

  // QR Code & Verification footer band
  const verifyUrl = `https://kiplstpsrinagar.com/verify/id/${encodeURIComponent(emp.empCode ?? '')}`
  const qrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=0&data=${encodeURIComponent(verifyUrl)}`
  const qrData = await toDataUrl(qrImgUrl)

  pdf.setFillColor(NAVY); pdf.rect(1, H - 24, W - 2, 23, 'F')

  if (qrData) {
    try {
      pdf.setFillColor('#ffffff'); pdf.roundedRect(4, H - 21.5, 18, 18, 1.5, 1.5, 'F')
      pdf.addImage(qrData, 'JPEG', 4.5, H - 21, 17, 17)
    } catch {}
  }

  pdf.setTextColor('#ffffff'); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(5.8)
  pdf.text('SCAN TO VERIFY', 25, H - 17)
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(4.6); pdf.setTextColor('#9DB4C6')
  pdf.text('Official Digital Personnel Record', 25, H - 13.5)
  pdf.setTextColor(AQUA); pdf.setFontSize(4.8)
  pdf.text('+91 9419 428 963', 25, H - 9.5)
  pdf.setTextColor('#9DB4C6'); pdf.setFontSize(4.4)
  pdf.text('kiplstpsrinagar.com', 25, H - 6)

  pdf.save(`KIPL-ID-${emp.empCode ?? 'employee'}.pdf`)
}
