import { jsPDF } from 'jspdf'

// ─────────────────────────────────────────────────────────────────────────────
// Monthly Progress Report (MPR) — mandatory with every RA bill (Tender Clause 23.3)
// Pulls physical progress (WBS), financials (RA bills), resources & weather
// (Site Diary + HR) and hindrances/approvals (EOT register + Liaison) into the
// EIC monthly proforma. A4 portrait, client-side via jsPDF.
// ─────────────────────────────────────────────────────────────────────────────

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

// Fixed project identity (matches WBS + tender contract data)
const PROJECT = {
  name: 'Sewerage Scheme Dal Lake (Uncovered Areas) — 38.5 MLD STP, Nishat',
  subtitle: 'Pollution Abatement of Dal Lake · EPC Turnkey · J&K UEED',
  client: 'J&K UEED / LCMA',
  allotment: 'CE/UEED/PS/2929-42 (07-Nov-2025)',
  contractStart: '2025-11-07',
  contractEnd: '2028-05-07', // 30 months excl. 6-month trial run
  contractor: 'Khilari Infrastructure Pvt. Ltd.',
}

export interface MprInput {
  month: number
  year: number
  raBillRef?: string
  contractValue?: string | number | null
  wbsDash: any
  tasks: any[]
  eot: any
  diary: any[]
  hr: any
  raBills: any[]
  liaison: any
}

const NAVY = '#0a1e28'
const GREEN = '#059669'
const AMBER = '#b45309'
const RED = '#b91c1c'
const MUTED = '#6b8592'

// jsPDF's standard Helvetica is WinAnsi-encoded and has no ₹ glyph — use "Rs ".
function inr(n: any): string {
  const v = Number(n) || 0
  return 'Rs ' + v.toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

export async function generateMPR(d: MprInput) {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = 210, H = 297, M = 14
  const CW = W - 2 * M
  const monthLabel = `${MONTHS[d.month - 1]} ${d.year}`
  let y = 0

  // ── chrome ────────────────────────────────────────────────────────────────
  const header = () => {
    pdf.setFillColor(NAVY); pdf.rect(0, 0, W, 22, 'F')
    pdf.setTextColor('#ffffff'); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11)
    pdf.text('MONTHLY PROGRESS REPORT', M, 10)
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.setTextColor('#9DB4C6')
    pdf.text(PROJECT.name, M, 16)
    pdf.setFontSize(9); pdf.setTextColor('#ffffff'); pdf.setFont('helvetica', 'bold')
    pdf.text(monthLabel, W - M, 10, { align: 'right' })
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5); pdf.setTextColor('#9DB4C6')
    pdf.text(d.raBillRef ? `RA Bill: ${d.raBillRef}` : 'Clause 23.3 submission', W - M, 16, { align: 'right' })
    y = 30
  }
  const footer = () => {
    const pg = pdf.getNumberOfPages()
    pdf.setDrawColor('#dbe6e0'); pdf.line(M, H - 12, W - M, H - 12)
    pdf.setFontSize(7); pdf.setTextColor(MUTED)
    pdf.text('KIPL ProjectOS — accompanies the RA bill per Tender Clause 23.3', M, H - 8)
    pdf.text(`Page ${pg}`, W - M, H - 8, { align: 'right' })
  }
  const ensure = (need: number) => { if (y + need > H - 16) { footer(); pdf.addPage(); header() } }

  const sectionTitle = (t: string) => {
    ensure(12)
    pdf.setFillColor('#f1f5f9'); pdf.rect(M, y, CW, 7, 'F')
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9.5); pdf.setTextColor(NAVY)
    pdf.text(t.toUpperCase(), M + 2, y + 5)
    y += 11
  }

  // Simple two-column key/value grid
  const kv = (rows: [string, string][], cols = 2) => {
    const colW = CW / cols
    const rowH = 8
    rows.forEach((r, i) => {
      const c = i % cols, rowIdx = Math.floor(i / cols)
      if (c === 0) ensure(rowH)
      const x = M + c * colW
      const yy = y + rowIdx * rowH
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5); pdf.setTextColor(MUTED)
      pdf.text(r[0].toUpperCase(), x, yy + 3)
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9.5); pdf.setTextColor('#0f172a')
      pdf.text(r[1] || '—', x, yy + 7.5)
    })
    y += Math.ceil(rows.length / cols) * rowH + 3
  }

  // Generic table
  const table = (heads: string[], widths: number[], rows: string[][], opts?: { color?: (r: string[]) => string | null }) => {
    const rowH = 6.5
    const drawHead = () => {
      pdf.setFillColor(NAVY); pdf.rect(M, y, CW, 7, 'F')
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7.5); pdf.setTextColor('#ffffff')
      let x = M + 1.5
      heads.forEach((h, i) => { pdf.text(h, x, y + 4.7); x += widths[i] })
      y += 7
    }
    ensure(14); drawHead()
    rows.forEach((r, ri) => {
      if (y + rowH > H - 16) { footer(); pdf.addPage(); header(); drawHead() }
      if (ri % 2 === 1) { pdf.setFillColor('#f8fafc'); pdf.rect(M, y, CW, rowH, 'F') }
      const tint = opts?.color?.(r)
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5)
      let x = M + 1.5
      r.forEach((cell, i) => {
        pdf.setTextColor(i === 0 && tint ? tint : '#334155')
        const txt = pdf.splitTextToSize(String(cell ?? ''), widths[i] - 2)[0] ?? ''
        pdf.text(txt, x, y + 4.4); x += widths[i]
      })
      y += rowH
    })
    y += 4
  }

  // ── derived values ──────────────────────────────────────────────────────────
  const physical = Number(d.wbsDash?.overallProgress ?? 0)
  const timeElapsed = Number(d.wbsDash?.contractPct ?? 0)
  const contractValue = d.contractValue ? Number(String(d.contractValue).replace(/[^0-9.]/g, '')) : 0

  const from = `${d.year}-${String(d.month).padStart(2, '0')}-01`
  const to = new Date(d.year, d.month, 0).toISOString().split('T')[0]
  const inMonth = (dt: any) => { const s = String(dt ?? '').split('T')[0]; return s >= from && s <= to }

  const bills = d.raBills ?? []
  const billedGross = bills.reduce((s: number, b: any) => s + (Number(b.grossAmount) || 0), 0)
  const billedNet = bills.reduce((s: number, b: any) => s + (Number(b.netPayable) || 0), 0)
  const retentionHeld = bills.reduce((s: number, b: any) => s + (Number(b.retentionAmount) || 0), 0)
  const monthBills = bills.filter((b: any) => inMonth(b.billDate))
  const financialPct = contractValue > 0 ? (billedGross / contractValue) * 100 : 0

  const monthDiary = (d.diary ?? []).filter((e: any) => inMonth(e.date))
  const rainyDays = monthDiary.filter((e: any) => e.weatherMorning === 'rainy' || e.weatherAfternoon === 'rainy' || e.workStoppedWeather).length
  const hoursLost = monthDiary.reduce((s: number, e: any) => s + (Number(e.hoursLost) || 0), 0)
  const avgLabour = monthDiary.length ? Math.round(monthDiary.reduce((s: number, e: any) => s + (Number(e.labourTotal) || 0), 0) / monthDiary.length) : 0
  const workItems = monthDiary.reduce((s: number, e: any) => s + (e.workDone?.length || 0), 0)
  const eotDiary = monthDiary.filter((e: any) => e.eotClaim)

  // ═══ PAGE 1 — Summary ════════════════════════════════════════════════════════
  header()

  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(15); pdf.setTextColor(NAVY)
  pdf.text('Progress Report', M, y + 3)
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9); pdf.setTextColor(MUTED)
  pdf.text(`${PROJECT.subtitle}  ·  Reporting month: ${monthLabel}`, M, y + 9)
  y += 16

  sectionTitle('Contract particulars')
  kv([
    ['Name of Work', 'Sewerage Scheme Dal Lake (Uncovered Areas)'],
    ['Employer / Client', PROJECT.client],
    ['Contractor', PROJECT.contractor],
    ['Allotment', PROJECT.allotment],
    ['Contract value', contractValue > 0 ? inr(contractValue) : 'As per LOA (set in Settings)'],
    ['Period of completion', '30 months + 6-month trial run + 5-yr O&M'],
    ['Commencement', PROJECT.contractStart],
    ['Stipulated completion', PROJECT.contractEnd],
  ])

  sectionTitle('Progress at a glance')
  const cards: [string, string, string][] = [
    ['Time elapsed', timeElapsed.toFixed(1) + '%', NAVY],
    ['Physical progress', physical.toFixed(1) + '%', GREEN],
    ['Financial progress', contractValue > 0 ? financialPct.toFixed(1) + '%' : '—', '#2563eb'],
    ['Days remaining', String(d.wbsDash?.daysRemaining ?? '—'), AMBER],
    ['Milestones achieved', `${d.wbsDash?.milestonesHit ?? 0} / ${d.wbsDash?.milestones ?? 0}`, NAVY],
    ['Critical activities', String(d.wbsDash?.criticalTasks ?? d.eot?.taskDelays?.length ?? 0), RED],
  ]
  const cw = CW / 3, ch = 20
  cards.forEach((c, i) => {
    const col = i % 3, row = Math.floor(i / 3)
    const x = M + col * cw, yy = y + row * (ch + 3)
    pdf.setDrawColor('#dbe6e0'); pdf.setFillColor('#f8fafc'); pdf.roundedRect(x, yy, cw - 3, ch, 2, 2, 'FD')
    pdf.setFontSize(7); pdf.setTextColor(MUTED); pdf.text(c[0].toUpperCase(), x + 3, yy + 6)
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(14); pdf.setTextColor(c[2]); pdf.text(c[1], x + 3, yy + 15)
    pdf.setFont('helvetica', 'normal')
  })
  y += Math.ceil(cards.length / 3) * (ch + 3) + 4

  // Physical vs time variance note
  const variance = physical - timeElapsed
  pdf.setFillColor(variance < -5 ? '#fef2f2' : '#f0fdf4')
  pdf.setDrawColor(variance < -5 ? '#fecaca' : '#bbf7d0')
  pdf.roundedRect(M, y, CW, 12, 2, 2, 'FD')
  pdf.setFontSize(8.5); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(variance < -5 ? RED : GREEN)
  pdf.text(
    variance < -5
      ? `Physical progress trails time elapsed by ${Math.abs(variance).toFixed(1)}% — see hindrances / EOT section.`
      : `Physical progress is broadly in step with time elapsed (${variance >= 0 ? '+' : ''}${variance.toFixed(1)}%).`,
    M + 3, y + 7.5)
  pdf.setFont('helvetica', 'normal')
  y += 16

  // ═══ Physical progress ═══════════════════════════════════════════════════════
  sectionTitle('Physical progress — WBS (Clause 17)')
  const majorTasks = (d.tasks ?? []).filter((t: any) => Number(t.level) === 1)
  table(
    ['Code', 'Activity', 'Planned', 'Actual', 'Status'],
    [16, 96, 22, 22, 26],
    majorTasks.map((t: any) => [
      t.wbsCode,
      t.title,
      t.plannedEnd ? String(t.plannedEnd).split('T')[0] : '—',
      Number(t.progressPct).toFixed(0) + '%',
      String(t.status ?? '').replace(/_/g, ' '),
    ]),
    { color: (r) => r[4].includes('delay') ? RED : r[4].includes('completed') ? GREEN : null },
  )

  // ═══ Financial progress ══════════════════════════════════════════════════════
  sectionTitle('Financial progress — RA bills (Clause 23)')
  if (bills.length === 0) {
    pdf.setFontSize(8.5); pdf.setTextColor(MUTED)
    pdf.text('No RA bills raised yet. Create them in EPC / BOQ.', M, y + 2); y += 8
  } else {
    table(
      ['Bill No.', 'Date', 'Gross', 'Retention 5%', 'Net Payable', 'Status'],
      [26, 26, 34, 32, 34, 30],
      bills.map((b: any) => [
        String(b.billNo ?? '—'),
        String(b.billDate ?? '').split('T')[0],
        inr(b.grossAmount),
        inr(b.retentionAmount),
        inr(b.netPayable),
        String(b.status ?? ''),
      ]),
    )
  }
  kv([
    ['Billed to date (gross)', inr(billedGross)],
    ['Billed this month', inr(monthBills.reduce((s: number, b: any) => s + (Number(b.grossAmount) || 0), 0))],
    ['Security deposit / retention held (5%)', inr(retentionHeld)],
    ['Net paid / payable to date', inr(billedNet)],
  ])

  // ═══ Resources & site conditions ═════════════════════════════════════════════
  sectionTitle('Resources & site conditions (from Site Diary)')
  kv([
    ['Diary entries this month', String(monthDiary.length)],
    ['Avg. labour / working day', String(avgLabour)],
    ['Staff strength on rolls', String(d.hr?.totalEmployees ?? '—')],
    ['Work items recorded', String(workItems)],
    ['Rainy / work-stopped days', String(rainyDays)],
    ['Man-hours lost to weather', String(hoursLost)],
  ], 3)

  // ═══ Hindrances / EOT ════════════════════════════════════════════════════════
  sectionTitle('Hindrances & EOT grounds (Clause 16)')
  const approvalDelays = (d.eot?.approvalDelays ?? []).filter((x: any) => x.isEotGround || Number(x.delayDays) > 0)
  const taskDelays = (d.eot?.taskDelays ?? [])
  if (approvalDelays.length === 0 && taskDelays.length === 0 && eotDiary.length === 0) {
    pdf.setFontSize(8.5); pdf.setTextColor(MUTED)
    pdf.text('No hindrances or EOT grounds recorded for this period.', M, y + 2); y += 8
  } else {
    const rows: string[][] = []
    approvalDelays.forEach((x: any) => rows.push(['Approval', x.subject ?? x.ref ?? '', String(x.delayDays) + 'd', x.criticalPathImpact ? 'Critical path' : 'Float']))
    taskDelays.forEach((x: any) => rows.push(['Site/Task', `${x.ref} ${x.subject ?? ''}`, String(x.delayDays) + 'd', x.criticalPathImpact ? 'Critical path' : 'Float']))
    eotDiary.forEach((e: any) => rows.push(['Weather', String(e.date).split('T')[0] + ' ' + (e.eotReason ?? ''), (e.hoursLost || 0) + 'h', 'Diary EOT']))
    table(['Type', 'Description', 'Delay', 'Impact'], [24, 108, 22, 28], rows,
      { color: (r) => r[3] === 'Critical path' ? RED : null })
    pdf.setFontSize(8); pdf.setTextColor(AMBER)
    pdf.text(`Claimable EOT (critical-path grounds): ${d.eot?.totals?.claimableEotDays ?? 0} days. Formal EOT application to be filed per Clause 16.`, M, y)
    y += 6
  }

  // ═══ Statutory approvals ═════════════════════════════════════════════════════
  sectionTitle('Statutory approvals (Liaison)')
  kv([
    ['Total files', String(d.liaison?.total ?? '—')],
    ['Under review', String(d.liaison?.by_status?.under_review ?? '—')],
    ['Approved', String(d.liaison?.by_status?.approved ?? '—')],
    ['Overdue', String(d.liaison?.overdue ?? '—')],
  ], 4)

  // ═══ Certification ═══════════════════════════════════════════════════════════
  ensure(34)
  y += 4
  pdf.setDrawColor('#cbd5e1'); pdf.line(M, y, M + 60, y); pdf.line(W - M - 60, y, W - M, y)
  pdf.setFontSize(8); pdf.setTextColor('#334155')
  pdf.text('Prepared by (Contractor)', M, y + 5)
  pdf.text('Reviewed by (Engineer-in-Charge)', W - M - 60, y + 5)
  pdf.setFontSize(7); pdf.setTextColor(MUTED)
  pdf.text(PROJECT.contractor, M, y + 10)
  pdf.text('J&K UEED', W - M - 60, y + 10)

  footer()
  pdf.save(`KIPL-MPR-${MONTHS[d.month - 1]}-${d.year}.pdf`)
}
