import { jsPDF } from 'jspdf'
import type { PumpAccount, PumpLine, FuelMachine, FuelRegister, FuelRow, FuelWarning, MachineUse } from '@/api/fuel.api'

/** "2026-11" → the month's first day to its last, or to today if the month is still running. */
export function monthRange(month: string, today: string) {
  const [y, m] = month.split('-').map(Number)
  const last = new Date(y, m, 0).getDate()
  const from = `${month}-01`
  const end = `${month}-${String(last).padStart(2, '0')}`
  return { from, to: end > today ? today : end }
}

export const monthLabel = (month: string) => {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

export const litres = (n: number | null | undefined) =>
  n === null || n === undefined ? '—' : `${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })} L`

export const rupees = (n: number | null | undefined) =>
  n === null || n === undefined ? '—' : `₹${Math.round(Number(n)).toLocaleString('en-IN')}`

/** jsPDF's built-in fonts have no rupee sign. */
const pdfRupees = (n: number | null | undefined) => (n === null || n === undefined ? '' : `Rs ${Math.round(Number(n)).toLocaleString('en-IN')}`)

export const shortDate = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

// ─── Stock gauge and trend ─────────────────────────────────────────────────

/** The gauge runs from empty to this many days of diesel at the recent rate. */
export const GAUGE_DAYS = 10
export type CoverLevel = 'low' | 'watch' | 'good' | 'unknown'

/** Under 2 days is low (buy now), under 4 is worth watching. */
export function coverLevel(days: number | null): CoverLevel {
  if (days === null) return 'unknown'
  return days < 2 ? 'low' : days < 4 ? 'watch' : 'good'
}

const addDays = (iso: string, n: number) => {
  const [y, m, d] = iso.split('-').map(Number)
  const t = new Date(Date.UTC(y, m - 1, d + n))
  return t.toISOString().slice(0, 10)
}

/** "About 1.7 days at 180 L a day, so around 25 Nov", or why there is no estimate. */
export function coverText(cover: { dailyAverage: number | null; daysOfCover: number | null; windowDays: number }, today: string) {
  if (cover.dailyAverage === null || cover.daysOfCover === null) {
    return cover.windowDays ? `No diesel issued in the last ${cover.windowDays} days, so no rate to go on` : 'Nothing recorded yet'
  }
  const runOut = addDays(today, Math.floor(cover.daysOfCover))
  return `About ${cover.daysOfCover} day${cover.daysOfCover === 1 ? '' : 's'} at ${litres(cover.dailyAverage)} a day: runs out around ${shortDate(runOut)}`
}

export interface DayPoint { date: string; balance: number; issued: number; purchased: number }

/**
 * Stock at the end of each day of the period, with that day's issues and
 * purchases. Days without entries carry the balance forward. A month the
 * register started part-way through begins on its first entry, not on a run
 * of empty days.
 */
export function dailySeries(reg: Pick<FuelRegister, 'from' | 'to' | 'entries' | 'summary'>, fuel: 'diesel' | 'petrol' = 'diesel'): DayPoint[] {
  const rows = reg.entries.filter(e => e.fuelType === fuel)
  const opening = reg.summary.stock[fuel].opening
  let start = reg.from
  if (opening === 0 && rows.length && rows[0].date > reg.from) start = rows[0].date
  const points: DayPoint[] = []
  let balance = opening
  for (let day = start; day <= reg.to; day = addDays(day, 1)) {
    const today = rows.filter(r => r.date === day)
    if (today.length) balance = today[today.length - 1].balance
    points.push({
      date: day,
      balance,
      issued: today.filter(r => r.entryType === 'issue').reduce((s, r) => s + r.litres, 0),
      purchased: today.filter(r => r.entryType === 'receipt').reduce((s, r) => s + r.litres, 0),
    })
  }
  return points
}

/** Litres per hour (or per km), and where the number came from. */
export function burnRate(m: Pick<MachineUse, 'meterRate' | 'logbookRate' | 'logbookUse' | 'litres' | 'meterUnit' | 'fills'>) {
  const unit = m.meterUnit === 'km' ? 'km' : 'hr'
  if (m.meterRate !== null) return { value: `${m.meterRate} L/${unit}`, basis: 'From meter readings at each fill' }
  if (m.logbookRate !== null) return { value: `${m.logbookRate} L/${unit}`, basis: `${m.litres} L over ${m.logbookUse} logged ${unit === 'hr' ? 'hours' : 'km'}. Only right if every working day is in the logbook` }
  if (!m.fills) return { value: '—', basis: 'No diesel this month' }
  return { value: 'Not known', basis: m.meterUnit === 'km' ? 'Record the odometer at each fill' : 'Record the hour meter at each fill' }
}

/** A receipt is diesel the site bought: it is shown as a purchase everywhere a person reads it. */
export const ENTRY_LABEL = { receipt: 'Purchased', issue: 'Issued', adjustment: 'Stock adjustment' } as const

/** Who or what the line is about: the machine for an issue, the pump for a receipt. */
export function rowParty(r: FuelRow, machines: Map<string, FuelMachine>) {
  if (r.entryType === 'issue') {
    const m = r.machineId ? machines.get(r.machineId) : null
    if (m) return m.ownership === 'hired' ? `${m.name} (${m.ownerName})` : m.name
    return r.logbookMachine ? `${r.logbookMachine} (not on the machine list)` : 'Machine not named'
  }
  if (r.entryType === 'receipt') return [r.supplier, r.billNo && `Bill ${r.billNo}`].filter(Boolean).join(' · ') || 'Supplier not recorded'
  return r.remarks || 'Adjustment'
}

export function describeWarning(w: FuelWarning): string {
  switch (w.kind) {
    case 'negative_stock': return `${w.fuelType === 'petrol' ? 'Petrol' : 'Diesel'} stock goes below zero (${litres(w.balance)}) on ${shortDate(w.date)}. A purchase is missing from the register, or an issue is wrong.`
    case 'no_meter': return `No meter reading at any fill for ${w.machines.map(m => m.name).join(', ')}, so ${w.machines.length === 1 ? 'its' : 'their'} consumption cannot be checked. Record the meter each time.`
    case 'meter_backwards': return `${w.name}: the meter reads ${w.reading} on ${shortDate(w.date)}, lower than the ${w.previous} before it.`
    case 'unpriced_receipts': return `${w.count} ${w.fuelType} purchase${w.count === 1 ? '' : 's'} this month (${litres(w.litres)}) ha${w.count === 1 ? 's' : 've'} no rate, so the diesel issued cannot be fully costed. Edit ${w.count === 1 ? 'it' : 'them'} and enter the rate from the bill.`
    case 'unlisted_machine': return `${litres(w.litres)} went to "${w.logbookMachine}" from the Fleet logbook, which is not on the machine list. Add it, or add that name to the right machine.`
  }
}

const csvCell = (v: unknown) => {
  const s = v === null || v === undefined ? '' : String(v)
  return /[",\r\n]/.test(s) || /^[=+\-@]/.test(s) ? `"${(/^[=+\-@]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"` : s
}

/** The register as a spreadsheet, the same columns as the paper log plus what the paper never had. */
export function registerCsv(reg: FuelRegister) {
  const machines = new Map(reg.machines.map(m => [m.id, m]))
  const head = ['Date', 'Fuel', 'Entry', 'Machine / supplier', 'Operator', 'Litres in', 'Litres out', 'Balance', 'Meter reading', 'Rate (₹/L)', 'Amount (₹)', 'Cost at average rate (₹)', 'Remarks', 'Recorded by']
  const rows = reg.entries.map(r => {
    const change = r.entryType === 'issue' ? -r.litres : r.litres
    return [r.date, r.fuelType, ENTRY_LABEL[r.entryType], rowParty(r, machines), r.operator ?? '',
      change > 0 ? change : '', change < 0 ? -change : '', r.balance, r.meterReading ?? '', r.rate ?? '', r.amount ?? '', r.cost ?? '',
      r.entryType === 'adjustment' ? '' : r.remarks ?? '', r.recordedByName ?? '']
  })
  return [head, ...rows].map(r => r.map(csvCell).join(',')).join('\r\n')
}

// ─── PDF ───────────────────────────────────────────────────────────────────

const NAVY = '#0a1e28', INK = '#0f172a', BODY = '#334155', MUTED = '#64748b', RULE = '#e2e8f0'
const W = 297, H = 210, M = 12, BOTTOM = H - 15

/** The month's register on A4 landscape, for the site file and for signing. */
export function renderRegisterPdf(reg: FuelRegister, opts: { projectName: string; month: string; generatedBy?: string; now?: Date }) {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const machines = new Map(reg.machines.map(m => [m.id, m]))
  const now = opts.now ?? new Date()
  const title = `Diesel register · ${monthLabel(opts.month)}`
  let y = 0

  const header = () => {
    pdf.setFillColor(NAVY); pdf.rect(0, 0, W, 22, 'F')
    pdf.setTextColor('#ffffff'); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(12)
    pdf.text(title.toUpperCase(), M, 10)
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5); pdf.setTextColor('#9fb3c4')
    pdf.text(`${pdf.splitTextToSize(opts.projectName, 160)[0]} · Khilari Infrastructure Pvt. Ltd.`, M, 16)
    pdf.setTextColor('#ffffff'); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9)
    pdf.text(`${shortDate(reg.from)} to ${shortDate(reg.to)}`, W - M, 10, { align: 'right' })
    y = 28
  }
  header()

  // Summary line: what the month did to stock.
  const d = reg.summary.stock.diesel, t = reg.summary.totals.diesel
  const boxes: [string, string][] = [
    ['Opening stock', litres(d.opening)], ['Purchased', `${litres(t.received)}${t.receivedAmount ? ` · ${pdfRupees(t.receivedAmount)}` : ''}`],
    // A cost for only part of the issues must not print as the month's cost.
    ['Issued', `${litres(t.issued)}${t.issuedCost && t.issuedPricedLitres >= t.issued ? ` · ${pdfRupees(t.issuedCost)}` : ''}`], ['Adjusted', litres(t.adjusted)], ['Closing stock', litres(d.closing)],
  ]
  const bw = (W - 2 * M - 4 * 3) / 5
  boxes.forEach(([label, value], i) => {
    const x = M + i * (bw + 3)
    pdf.setDrawColor('#cbd5e1'); pdf.setFillColor('#f8fafc'); pdf.roundedRect(x, y, bw, 13, 1.5, 1.5, 'FD')
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(6.5); pdf.setTextColor(MUTED); pdf.text(label.toUpperCase(), x + 3, y + 5)
    pdf.setFontSize(9); pdf.setTextColor(INK); pdf.text(value, x + 3, y + 10.5)
  })
  y += 19
  if (t.issued && t.issuedPricedLitres < t.issued) {
    pdf.setFont('helvetica', 'italic'); pdf.setFontSize(7); pdf.setTextColor(MUTED)
    pdf.text(`Cost shown only where the purchase rate is known: ${litres(t.issuedPricedLitres)} of ${litres(t.issued)} issued${t.issuedCost ? ` (${pdfRupees(t.issuedCost)})` : ''}. Enter rates on purchases to cost the rest.`, M, y - 2)
    y += 3
  }

  const cols: { label: string; w: number; get: (r: FuelRow) => string; align?: 'right' }[] = [
    { label: 'Date', w: 18, get: r => shortDate(r.date) },
    { label: 'Entry', w: 26, get: r => ENTRY_LABEL[r.entryType] },
    { label: 'Machine / supplier', w: 66, get: r => rowParty(r, machines) },
    { label: 'Operator', w: 28, get: r => r.operator ?? '' },
    { label: 'In (L)', w: 18, align: 'right', get: r => (r.entryType === 'issue' || r.litres < 0 ? '' : String(r.litres)) },
    { label: 'Out (L)', w: 18, align: 'right', get: r => (r.entryType === 'issue' ? String(r.litres) : r.litres < 0 ? String(-r.litres) : '') },
    { label: 'Balance (L)', w: 22, align: 'right', get: r => String(r.balance) },
    { label: 'Meter', w: 18, align: 'right', get: r => (r.meterReading === null ? '' : String(r.meterReading)) },
    { label: 'Amount / cost', w: 24, align: 'right', get: r => (r.amount !== null ? pdfRupees(r.amount) : r.cost !== null ? pdfRupees(r.cost) : '') },
    { label: 'Recorded by', w: 35, get: r => r.recordedByName ?? '' },
  ]
  const tableHeader = () => {
    pdf.setFillColor('#eef2f7'); pdf.rect(M, y, W - 2 * M, 6.5, 'F')
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(6.8); pdf.setTextColor(BODY)
    let x = M
    for (const c of cols) { pdf.text(c.label.toUpperCase(), c.align ? x + c.w - 1.5 : x + 1.5, y + 4.3, c.align ? { align: 'right' } : undefined); x += c.w }
    y += 6.5
  }
  tableHeader()
  pdf.setFont('helvetica', 'italic'); pdf.setFontSize(7.5); pdf.setTextColor(MUTED)
  pdf.text(`Brought forward: ${litres(d.opening)}`, M + 1.5, y + 4.5); y += 6.5
  for (const r of reg.entries) {
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5)
    const cells = cols.map(c => pdf.splitTextToSize(c.get(r), c.w - 3) as string[])
    const h = Math.max(...cells.map(c => c.length)) * 3.3 + 3
    if (y + h > BOTTOM) { pdf.addPage(); header(); tableHeader() }
    let x = M
    cols.forEach((c, i) => {
      pdf.setTextColor(c.label === 'Balance (L)' ? INK : BODY)
      pdf.setFont('helvetica', c.label === 'Balance (L)' ? 'bold' : 'normal')
      pdf.text(cells[i], c.align ? x + c.w - 1.5 : x + 1.5, y + 4.2, c.align ? { align: 'right' } : undefined)
      x += c.w
    })
    y += h
    pdf.setDrawColor(RULE); pdf.line(M, y, W - M, y)
  }
  if (!reg.entries.length) { pdf.setFont('helvetica', 'normal'); pdf.setTextColor(MUTED); pdf.text('No diesel moved this month.', M + 1.5, y + 5); y += 8 }

  // Per machine, and what went into hired machines.
  const used = reg.summary.machines.filter(m => m.fills)
  if (used.length) {
    if (y + 12 + used.length * 5 > BOTTOM) { pdf.addPage(); header() }
    y += 7
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8); pdf.setTextColor(NAVY); pdf.text('BY MACHINE', M, y); y += 4.5
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5); pdf.setTextColor(BODY)
    for (const m of used) {
      const rate = burnRate(m)
      pdf.text(`${m.name}${m.ownership === 'hired' ? ` (hired from ${m.ownerName})` : ''}`, M, y)
      pdf.text(`${litres(m.litres)} in ${m.fills} fill${m.fills === 1 ? '' : 's'}`, M + 110, y)
      pdf.text(rate.value === '—' ? '' : `${rate.value}`, M + 160, y)
      pdf.text(m.cost ? pdfRupees(m.cost) : '', M + 200, y)
      y += 4.5
    }
    for (const o of reg.summary.hiredOwners) {
      pdf.setFont('helvetica', 'bold'); pdf.text(`Into ${o.ownerName}'s machines: ${litres(o.litres)}${o.cost ? ` (${pdfRupees(o.cost)})` : ''}. Check against their bill.`, M, y + 1.5); y += 5
    }
  }

  // The advance with the pump, as it stands today.
  if (reg.pump) {
    if (y + 14 > BOTTOM) { pdf.addPage(); header() }
    y += 4
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8); pdf.setTextColor(NAVY); pdf.text('PUMP ACCOUNT', M, y); y += 4.5
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5); pdf.setTextColor(BODY)
    pdf.text(pumpSummaryLine(reg.pump, true), M, y); y += 4.5
  }

  // Signatures.
  if (y + 24 > BOTTOM) { pdf.addPage(); header() }
  y += 14
  pdf.setDrawColor('#94a3b8'); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5); pdf.setTextColor(BODY)
  for (const [label, x] of [['Store keeper (name & signature)', M], ['Site in-charge (name & signature)', M + 100], ['Date', M + 200]] as const) {
    pdf.line(x, y + 8, x + (label === 'Date' ? 60 : 85), y + 8); pdf.text(label, x, y + 12)
  }

  const at = now.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  const pages = pdf.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    pdf.setPage(i)
    pdf.setDrawColor(RULE); pdf.line(M, H - 10, W - M, H - 10)
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(6.5); pdf.setTextColor(MUTED)
    pdf.text(`KIPL ProjectOS · ${title} · Generated ${at}${opts.generatedBy ? ` by ${opts.generatedBy}` : ''}`, M, H - 6)
    pdf.text(`Page ${i} of ${pages}`, W - M, H - 6, { align: 'right' })
  }
  return pdf
}

export const registerFileName = (month: string, ext: 'pdf' | 'csv') => `KIPL-diesel-register-${month}.${ext}`

// ─── The pump account ──────────────────────────────────────────────────────

export const PUMP_KIND_LABEL: Record<PumpLine['kind'], string> = {
  payment: 'Payment',
  lift: 'Diesel, before the register',
  purchase: 'Purchase',
}

/** Rupees per litre keeps its paise: "96.42". */
export const perLitre = (rate: number) => rate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** "Hazratbal Filling Station: ₹7,36,229 paid, 3,050 L taken worth ₹2,94,081, ₹4,42,148 left (about 4,585 L at ₹96.42 a litre)." */
export function pumpSummaryLine(pump: PumpAccount, pdf = false) {
  const money = pdf ? pdfRupees : rupees
  const sign = pdf ? 'Rs ' : '₹'
  const rate = pump.supplier.rate
  const left = pump.balance < 0
    ? `${money(-pump.balance)} owed to the pump`
    : `${money(pump.balance)} left${pump.balanceLitres !== null && rate ? ` (about ${litres(pump.balanceLitres)} at ${sign}${perLitre(rate)} a litre)` : ''}`
  return `${pump.supplier.name}: ${money(pump.paid)} paid, ${litres(pump.litresTaken)} taken worth ${money(pump.taken)}, ${left}.`
}

/** What the advance means in days of diesel, or why it needs attention. */
export function pumpStatusText(pump: PumpAccount) {
  if (pump.warning === 'overdrawn') return `More diesel taken than paid for: ${rupees(-pump.balance)} owed to ${pump.supplier.name}. Pay before the next delivery.`
  if (pump.balanceLitres === null) return 'Set the pump rate to see how much diesel the advance buys.'
  const litresText = `About ${litres(pump.balanceLitres)} of diesel paid for`
  if (pump.daysCovered === null) return `${litresText}.`
  if (pump.warning === 'low') return `${litresText}: only ${pump.daysCovered} days at the recent rate. Top up the advance.`
  return `${litresText}: about ${Math.floor(pump.daysCovered)} days at the recent rate.`
}
