import { jsPDF } from 'jspdf'

// ─────────────────────────────────────────────────────────────────────────────
// Application for Extension of Time (Tender Clause 16) — the statutory three-part
// hindrance proforma. Part I (contractor) is auto-filled from the EOT register;
// Parts II (Engineer-in-Charge) and III (HOD grant) are rendered as the blank
// template for UEED to complete. A4 portrait, client-side via jsPDF.
// ─────────────────────────────────────────────────────────────────────────────

const PROJECT = {
  name: 'Survey, Design & Execution of Sewerage Scheme Dal Lake (Uncovered Areas)',
  client: 'J&K UEED / LCMA',
  allotment: 'CE/UEED/PS/2929-42 (07-Nov-2025)',
  contractStart: '2025-11-07',
  contractEnd: '2028-05-07',
  contractor: 'Khilari Infrastructure Pvt. Ltd.',
}

const NAVY = '#0a1e28', MUTED = '#6b8592', RED = '#b91c1c'

export interface EotInput {
  refNo?: string
  appliedUpto?: string          // date extension is applied up to
  previousExtensions?: string   // free-text; blank = none granted yet
  contractValue?: string | number | null
  wbsDash: any
  eot: any                      // eotRegister { approvalDelays, taskDelays, totals }
  diary: any[]                  // EOT-flagged diary entries (weather hindrances)
}

interface Hindrance {
  nature: string
  doo: string       // date of occurrence
  period: string    // period likely to last
  net: number       // net extension applied for (days)
  remarks: string
}

export async function generateEOTApplication(d: EotInput) {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = 210, H = 297, M = 16, CW = W - 2 * M
  let y = 0

  const header = (part: string) => {
    pdf.setFillColor(NAVY); pdf.rect(0, 0, W, 20, 'F')
    pdf.setTextColor('#ffffff'); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11)
    pdf.text('APPLICATION FOR EXTENSION OF TIME', M, 9)
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5); pdf.setTextColor('#9DB4C6')
    pdf.text('Tender Clause 16 · J&K UEED', M, 15)
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9); pdf.setTextColor('#ffffff')
    pdf.text(part, W - M, 9, { align: 'right' })
    if (d.refNo) { pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5); pdf.setTextColor('#9DB4C6'); pdf.text('Ref: ' + d.refNo, W - M, 15, { align: 'right' }) }
    y = 28
  }
  const footer = () => {
    pdf.setDrawColor('#dbe6e0'); pdf.line(M, H - 12, W - M, H - 12)
    pdf.setFontSize(7); pdf.setTextColor(MUTED)
    pdf.text('KIPL ProjectOS — EOT application per Tender Clause 16', M, H - 8)
    pdf.text('Page ' + pdf.getNumberOfPages(), W - M, H - 8, { align: 'right' })
  }
  const ensure = (need: number) => { if (y + need > H - 16) { footer(); pdf.addPage(); header('(cont.)') } }

  const numbered = (n: string, label: string, value: string) => {
    ensure(9)
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8.5); pdf.setTextColor('#0f172a')
    pdf.text(n, M, y + 4)
    pdf.setFont('helvetica', 'normal'); pdf.setTextColor('#334155')
    const lab = pdf.splitTextToSize(label, 78)
    pdf.text(lab, M + 8, y + 4)
    pdf.setFont('helvetica', 'bold'); pdf.setTextColor(NAVY)
    const val = pdf.splitTextToSize(value || '—', 82)
    pdf.text(val, M + 92, y + 4)
    y += Math.max(lab.length, val.length) * 4.2 + 4
  }

  // ── Compile hindrances from the EOT register ────────────────────────────────
  const hindrances: Hindrance[] = []
  ;(d.eot?.approvalDelays ?? []).filter((x: any) => x.isEotGround || Number(x.delayDays) > 0).forEach((x: any) => {
    hindrances.push({
      nature: `Delay in ${x.subject ?? x.ref ?? 'approval'}${x.department ? ' (' + x.department + ')' : ''}`,
      doo: x.expectedDate ? String(x.expectedDate).split('T')[0] : '',
      period: `${x.delayDays} days${x.actualDate ? '' : ' (ongoing)'}`,
      net: (x.isEotGround && x.criticalPathImpact) ? Number(x.delayDays) || 0 : 0,
      remarks: x.criticalPathImpact ? 'On critical path' : 'Absorbed by float',
    })
  })
  ;(d.eot?.taskDelays ?? []).forEach((x: any) => {
    hindrances.push({
      nature: `${x.ref} — ${x.subject}${x.reason ? ': ' + x.reason : ''}`,
      doo: '',
      period: `${x.delayDays} days`,
      net: x.eotApplied ? (Number(x.eotDays) || Number(x.delayDays) || 0) : 0,
      remarks: x.criticalPathImpact ? 'On critical path' : 'Absorbed by float',
    })
  })
  ;(d.diary ?? []).filter((e: any) => e.eotClaim).forEach((e: any) => {
    hindrances.push({
      nature: 'Adverse weather / work stoppage' + (e.eotReason ? ': ' + e.eotReason : ''),
      doo: String(e.date).split('T')[0],
      period: `${e.hoursLost || 0} hrs lost`,
      net: 0,
      remarks: 'Weather — see Site Diary',
    })
  })

  const claimable = Number(d.eot?.totals?.claimableEotDays ?? hindrances.reduce((s, h) => s + h.net, 0))
  const cv = d.contractValue ? Number(String(d.contractValue).replace(/[^0-9.]/g, '')) : 0

  // ═══ PART I — Contractor's application ══════════════════════════════════════
  header('PART I — Contractor')
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(12); pdf.setTextColor(NAVY)
  pdf.text('Part I — Statement by the Contractor', M, y + 2); y += 9

  numbered('1.', 'Name of work', PROJECT.name)
  numbered('2.', 'Name of contractor', PROJECT.contractor)
  numbered('3.', 'Agreement / Allotment No.', PROJECT.allotment)
  numbered('4.', 'Estimated / tendered cost', cv > 0 ? 'Rs ' + cv.toLocaleString('en-IN') : 'As per LOA')
  numbered('5.', 'Date of commencement', PROJECT.contractStart)
  numbered('6.', 'Stipulated date of completion', PROJECT.contractEnd + ' (30 months excl. trial run)')
  numbered('7.', 'Extensions previously applied for / granted', d.previousExtensions || 'Nil — this is the first application')
  numbered('8.', 'Total extension previously given', d.previousExtensions ? '(as above)' : 'Nil')
  numbered('9.', 'Period for which extension is now applied for', claimable > 0 ? `${claimable} days (up to ${d.appliedUpto || '____________'})` : '(to be assessed)')

  // Item 11 — hindrance register
  ensure(12)
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9); pdf.setTextColor('#0f172a')
  pdf.text('11.  Hindrances on account of which extension is applied for', M, y + 4); y += 8

  const heads = ['S.No', 'Nature of hindrance', 'Date of occ.', 'Period', 'Net EOT', 'Remarks']
  const widths = [10, 74, 24, 24, 18, 28]
  const drawHead = () => {
    pdf.setFillColor(NAVY); pdf.rect(M, y, CW, 7, 'F')
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7); pdf.setTextColor('#ffffff')
    let x = M + 1.5; heads.forEach((h, i) => { pdf.text(h, x, y + 4.7); x += widths[i] })
    y += 7
  }
  ensure(16); drawHead()
  if (hindrances.length === 0) {
    pdf.setFontSize(8); pdf.setTextColor(MUTED); pdf.text('No hindrances recorded in the EOT register.', M + 2, y + 4); y += 8
  } else {
    hindrances.forEach((h, i) => {
      const natLines = pdf.splitTextToSize(h.nature, widths[1] - 2)
      const rh = Math.max(6.5, natLines.length * 3.6 + 2.5)
      if (y + rh > H - 16) { footer(); pdf.addPage(); header('(cont.)'); drawHead() }
      if (i % 2 === 1) { pdf.setFillColor('#f8fafc'); pdf.rect(M, y, CW, rh, 'F') }
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7); pdf.setTextColor('#334155')
      let x = M + 1.5
      pdf.text(String(i + 1), x, y + 4); x += widths[0]
      pdf.text(natLines, x, y + 4); x += widths[1]
      pdf.text(h.doo || '—', x, y + 4); x += widths[2]
      pdf.text(h.period, x, y + 4); x += widths[3]
      pdf.setTextColor(h.net > 0 ? RED : MUTED); pdf.text(h.net > 0 ? String(h.net) + 'd' : '—', x, y + 4); x += widths[4]
      pdf.setTextColor('#334155'); pdf.text(pdf.splitTextToSize(h.remarks, widths[5] - 2), x, y + 4)
      y += rh
    })
  }
  y += 3
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8.5); pdf.setTextColor(NAVY)
  pdf.text(`Net extension applied for on account of hindrances above: ${claimable} days`, M, y + 2); y += 8
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.setTextColor('#334155')
  pdf.text('12.  Extension of time required for extra work: ______ days', M, y + 2); y += 6
  pdf.text('13.  Details / value of extra work: ______________________________', M, y + 2); y += 6
  pdf.setFont('helvetica', 'bold'); pdf.setTextColor(NAVY)
  pdf.text(`14.  Total extension of time now applied for (11 + 12): ${claimable} days`, M, y + 2); y += 12

  ensure(24)
  pdf.setDrawColor('#cbd5e1'); pdf.line(W - M - 62, y, W - M, y)
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.setTextColor('#334155')
  pdf.text('Signature of Contractor', W - M - 62, y + 5)
  pdf.text(PROJECT.contractor, W - M - 62, y + 10)
  pdf.text('Date: ____________', M, y + 5)

  // ═══ PART II — Engineer-in-Charge ═══════════════════════════════════════════
  footer(); pdf.addPage(); header('PART II — Engineer-in-Charge')
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(12); pdf.setTextColor(NAVY)
  pdf.text('Part II — For use by the Engineer-in-Charge', M, y + 2); y += 10
  const blanks = [
    '1.  Date of receipt of application from contractor: ____________________',
    '2.  Acknowledgement issued vide letter No. __________ dated __________',
    '3.  EIC remarks on each hindrance (serial-wise): net period recommended,',
    '     overlapping period, and justification —',
  ]
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8.5); pdf.setTextColor('#334155')
  blanks.forEach(b => { ensure(7); pdf.text(b, M, y + 3); y += 7 })
  // ruled space for EIC remarks
  for (let i = 0; i < 8; i++) { ensure(7); pdf.setDrawColor('#e2e8f0'); pdf.line(M, y + 3, W - M, y + 3); y += 7 }
  y += 2
  ;['4.  Present progress of work: __________%. Work likely to be completed by the extended date: Yes / No.',
    '5.  If extension NOT recommended, compensation for delay proposed under Clause 8.1',
    '     (0.05% per day, max 10% of contract value): _________________________',
  ].forEach(b => { ensure(8); pdf.setFontSize(8.5); pdf.setTextColor('#334155'); const l = pdf.splitTextToSize(b, CW); pdf.text(l, M, y + 3); y += l.length * 4.4 + 3 })
  y += 8
  pdf.setDrawColor('#cbd5e1'); pdf.line(M, y, M + 60, y); pdf.line(W - M - 60, y, W - M, y)
  pdf.setFontSize(8); pdf.setTextColor('#334155')
  pdf.text('Signature — Engineer-in-Charge', M, y + 5)
  pdf.text('Approval — HOD / Chief Engineer', W - M - 60, y + 5)

  // ═══ PART III — Grant of extension ══════════════════════════════════════════
  footer(); pdf.addPage(); header('PART III — Grant')
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(12); pdf.setTextColor(NAVY)
  pdf.text('Part III — Proforma for grant of extension', M, y + 2); y += 12
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9); pdf.setTextColor('#334155')
  const body = [
    'To,',
    PROJECT.contractor,
    '',
    `Subject: Grant of extension of time for completion of "${PROJECT.name.slice(0, 60)}..."`,
    '',
    'Dear Sir(s),',
    '',
    'With reference to your application cited above in connection with the grant of extension',
    `of time for completion of the work, the date of completion stipulated in the agreement`,
    `dated ____________ is hereby extended up to ${d.appliedUpto || '____________'}.`,
    '',
    'This extension is granted without prejudice to the right of the JKUEED to recover',
    'compensation for delay in accordance with Clause 8.1 of the said agreement. It is also',
    'clearly understood that the JKUEED shall not consider any revision in contract price or',
    'any other compensation whatsoever on account of the grant of this extension.',
  ]
  body.forEach(line => { ensure(6); pdf.text(line, M, y + 3); y += line === '' ? 3 : 5.5 })
  y += 14
  pdf.setDrawColor('#cbd5e1'); pdf.line(W - M - 62, y, W - M, y)
  pdf.setFontSize(8); pdf.setTextColor('#334155')
  pdf.text('Chief Engineer, J&K UEED', W - M - 62, y + 5)

  footer()
  pdf.save(`KIPL-EOT-Application-${new Date().toISOString().split('T')[0]}.pdf`)
}
