import { jsPDF } from 'jspdf'
import { CATEGORIES, CONDITIONS, STATUSES } from '@/api/assets.api'
import type { AssetCategory, AssetList, OfficeAsset } from '@/api/assets.api'
import { describeOrigin } from './assetForm'

/**
 * The asset register as a printable A4 landscape PDF: every asset matching the
 * page's filters, grouped by category, with where each one came from and a
 * signature block for a physical verification.
 *
 * Built in the browser like the material register and WBS PDFs. The layout
 * model is separate from the drawing so it can be tested without a browser.
 */

export interface RegisterFilters { search?: string; category?: string; status?: string }

export interface RegisterRow {
  no: number; tag: string; name: string; detail: string; serial: string
  location: string; custodian: string; condition: string; status: string; origin: string
}
export interface RegisterGroup { category: AssetCategory; label: string; rows: RegisterRow[] }
export interface RegisterModel {
  total: number
  groups: RegisterGroup[]
  /** Status label and count, in the app's status order, non-zero only. */
  byStatus: [string, number][]
  /** What the filters selected, in words. */
  scope: string
}

const CATEGORY_ORDER = Object.keys(CATEGORIES) as AssetCategory[]
const DASH = '—'

/** Brand and model, unless the name already says all of it ("Maruti Suzuki Brezza"). */
function detailLine(a: Pick<OfficeAsset, 'name' | 'brand' | 'model'>) {
  const detail = [a.brand, a.model].filter(Boolean).join(' ')
  const name = a.name.toLowerCase()
  return detail.toLowerCase().split(/\s+/).every(word => name.includes(word)) ? '' : detail
}

/** KIPL-AST-000012 sorts as 12; any other tag sorts after the numbered ones, alphabetically. */
function compareTags(a: string, b: string) {
  const n = (t: string) => /^KIPL-AST-\d+$/.test(t) ? Number(t.slice(9)) : Infinity
  return n(a) - n(b) || a.localeCompare(b)
}

export function describeScope(filters: RegisterFilters) {
  const parts = [
    filters.category && `Category: ${CATEGORIES[filters.category as AssetCategory] ?? filters.category}`,
    filters.status && `Status: ${STATUSES[filters.status as keyof typeof STATUSES] ?? filters.status}`,
    filters.search?.trim() && `Search: "${filters.search.trim()}"`,
  ].filter(Boolean)
  return parts.length ? parts.join(' · ') : 'All assets'
}

export function buildRegisterModel(assets: OfficeAsset[], filters: RegisterFilters): RegisterModel {
  const sorted = [...assets].sort((a, b) =>
    CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category) || compareTags(a.assetTag, b.assetTag))
  const groups: RegisterGroup[] = []
  sorted.forEach((a, i) => {
    let group = groups[groups.length - 1]
    if (!group || group.category !== a.category) {
      group = { category: a.category, label: CATEGORIES[a.category] ?? a.category, rows: [] }
      groups.push(group)
    }
    group.rows.push({
      no: i + 1,
      tag: a.assetTag,
      name: a.name,
      detail: detailLine(a),
      serial: [a.serialNumber, a.registrationNumber && `Reg. ${a.registrationNumber}`].filter(Boolean).join(' · ') || DASH,
      location: a.location,
      custodian: a.assignedTo || DASH,
      condition: CONDITIONS[a.condition] ?? a.condition,
      status: STATUSES[a.status] ?? a.status,
      origin: describeOrigin(a.acquisition, a.sourceSite) || DASH,
    })
  })
  const counts = new Map<string, number>()
  for (const a of assets) counts.set(a.status, (counts.get(a.status) ?? 0) + 1)
  const byStatus = (Object.keys(STATUSES) as (keyof typeof STATUSES)[])
    .filter(s => counts.get(s)).map(s => [STATUSES[s], counts.get(s)!] as [string, number])
  return { total: assets.length, groups, byStatus, scope: describeScope(filters) }
}

/** Every asset matching the filters, page by page. The list endpoint returns 25 at a time. */
export async function fetchAllAssets(fetchPage: (page: number) => Promise<Pick<AssetList, 'items' | 'total'>>, maxPages = 400) {
  const all: OfficeAsset[] = []
  for (let page = 1; page <= maxPages; page++) {
    const { items, total } = await fetchPage(page)
    all.push(...items)
    if (!items.length || all.length >= total) break
  }
  return all
}

/** The KIPL logo as a small PNG data URL, or null if it cannot be loaded. Browser only. */
export function loadLogo(url = '/assets/kipl-logo.png', size = 160): Promise<string | null> {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => {
      try {
        const k = Math.min(1, size / Math.max(img.naturalWidth, img.naturalHeight))
        const c = document.createElement('canvas')
        c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k)
        c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
        resolve(c.toDataURL('image/png'))
      } catch { resolve(null) }
    }
    img.onerror = () => resolve(null)
    img.src = url
  })
}

const NAVY = '#0a1e28'
const INK = '#0f172a'
const BODY = '#334155'
const MUTED = '#64748b'
const RULE = '#e2e8f0'

const W = 297, H = 210, M = 12
const COLS: { key: keyof RegisterRow | 'asset'; label: string; w: number }[] = [
  { key: 'no', label: 'S. No.', w: 10 },
  { key: 'tag', label: 'Asset tag', w: 25 },
  { key: 'asset', label: 'Asset', w: 56 },
  { key: 'serial', label: 'Serial / reg. no.', w: 33 },
  { key: 'location', label: 'Location', w: 37 },
  { key: 'custodian', label: 'Custodian', w: 29 },
  { key: 'condition', label: 'Condition', w: 17 },
  { key: 'status', label: 'Status', w: 18 },
  { key: 'origin', label: 'Came from', w: 48 },
]
const PAD = 1.6
const LINE = 3.3
const BOTTOM = H - 15

export interface RenderOptions {
  projectName: string
  generatedBy?: string
  now?: Date
  /** PNG data URL from loadLogo(). */
  logo?: string | null
}

export function renderRegisterPdf(model: RegisterModel, opts: RenderOptions): jsPDF {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const now = opts.now ?? new Date()
  const asOn = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  const at = now.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  let y = 0

  const header = () => {
    pdf.setFillColor(NAVY)
    pdf.rect(0, 0, W, 24, 'F')
    let x = M
    if (opts.logo) {
      try { pdf.addImage(opts.logo, 'PNG', M, 4, 16, 16); x = M + 20 } catch { /* prints without it */ }
    }
    pdf.setTextColor('#ffffff'); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(12)
    pdf.text('ASSET & INVENTORY REGISTER', x, 10)
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5); pdf.setTextColor('#9fb3c4')
    pdf.text(pdf.splitTextToSize(opts.projectName, 150)[0], x, 15.5)
    pdf.text('Khilari Infrastructure Pvt. Ltd.', x, 19.5)
    pdf.setTextColor('#ffffff'); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9)
    pdf.text(`As on ${asOn}`, W - M, 10, { align: 'right' })
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5); pdf.setTextColor('#cbd5e1')
    pdf.text(pdf.splitTextToSize(model.scope, 110)[0], W - M, 15.5, { align: 'right' })
    pdf.text(`${model.total} asset${model.total === 1 ? '' : 's'}`, W - M, 19.5, { align: 'right' })
    y = 30
  }

  const tableHeader = () => {
    pdf.setFillColor('#eef2f7'); pdf.rect(M, y, W - 2 * M, 7, 'F')
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7); pdf.setTextColor(BODY)
    let x = M
    for (const c of COLS) { pdf.text(c.label.toUpperCase(), x + PAD, y + 4.6); x += c.w }
    y += 7
  }

  const newPage = () => { pdf.addPage(); header(); tableHeader() }

  const groupRow = (g: RegisterGroup, continued: boolean) => {
    pdf.setFillColor('#f6f8fb'); pdf.rect(M, y, W - 2 * M, 6.5, 'F')
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7.5); pdf.setTextColor(NAVY)
    pdf.text(`${g.label.toUpperCase()}  ·  ${g.rows.length}${continued ? '  (continued)' : ''}`, M + PAD, y + 4.4)
    y += 6.5
  }

  header()

  // Summary: what is in the register, by category and by status.
  const byCategory = model.groups.map(g => `${g.label} ${g.rows.length}`).join('   ·   ')
  const byStatus = model.byStatus.map(([s, n]) => `${s} ${n}`).join('   ·   ')
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5)
  const catLines: string[] = pdf.splitTextToSize(byCategory || DASH, W - 2 * M - 30)
  const boxH = 6 + (catLines.length + 1) * 4
  pdf.setDrawColor('#cbd5e1'); pdf.setFillColor('#f8fafc'); pdf.roundedRect(M, y, W - 2 * M, boxH, 1.5, 1.5, 'FD')
  pdf.setFont('helvetica', 'bold'); pdf.setTextColor(MUTED); pdf.setFontSize(7)
  pdf.text('BY CATEGORY', M + 3, y + 5.5)
  pdf.text('BY STATUS', M + 3, y + 5.5 + catLines.length * 4)
  pdf.setFont('helvetica', 'normal'); pdf.setTextColor(INK); pdf.setFontSize(7.5)
  pdf.text(catLines, M + 28, y + 5.5)
  pdf.text(byStatus || DASH, M + 28, y + 5.5 + catLines.length * 4)
  y += boxH + 5

  if (!model.total) {
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10); pdf.setTextColor(MUTED)
    pdf.text('No assets match these filters.', M, y + 6)
  } else {
    tableHeader()
    for (const g of model.groups) {
      if (y + 6.5 + 14 > BOTTOM) newPage()
      groupRow(g, false)
      for (const r of g.rows) {
        pdf.setFontSize(7.5)
        const cell = (key: (typeof COLS)[number]['key'], w: number): string[] => {
          if (key === 'asset') return []
          return pdf.splitTextToSize(String(r[key]), w - 2 * PAD)
        }
        const assetW = COLS.find(c => c.key === 'asset')!.w - 2 * PAD
        pdf.setFont('helvetica', 'bold')
        const nameLines: string[] = pdf.splitTextToSize(r.name, assetW)
        pdf.setFont('helvetica', 'normal')
        const detailLines: string[] = r.detail ? pdf.splitTextToSize(r.detail, assetW) : []
        const lines = COLS.map(c => c.key === 'asset' ? nameLines.length + detailLines.length : cell(c.key, c.w).length)
        const h = Math.max(...lines) * LINE + 2 * PAD
        if (y + h > BOTTOM) { newPage(); groupRow(g, true) }

        let x = M
        for (const c of COLS) {
          const top = y + PAD + 2.5
          if (c.key === 'asset') {
            pdf.setFont('helvetica', 'bold'); pdf.setTextColor(INK); pdf.text(nameLines, x + PAD, top)
            if (detailLines.length) {
              pdf.setFont('helvetica', 'normal'); pdf.setTextColor(MUTED)
              pdf.text(detailLines, x + PAD, top + nameLines.length * LINE)
            }
          } else {
            pdf.setFont('helvetica', c.key === 'tag' ? 'bold' : 'normal')
            pdf.setTextColor(c.key === 'no' ? MUTED : BODY)
            pdf.text(cell(c.key, c.w), x + PAD, top)
          }
          x += c.w
        }
        y += h
        pdf.setDrawColor(RULE); pdf.line(M, y, W - M, y)
      }
    }
  }

  // Signature block for a physical verification.
  if (y + 26 > BOTTOM) { pdf.addPage(); header() }
  y += 12
  pdf.setDrawColor('#94a3b8'); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5); pdf.setTextColor(BODY)
  const sign = [['Physically verified by (name & signature)', M], ['Site in-charge (name & signature)', M + 100], ['Date', M + 200]] as const
  for (const [label, x] of sign) {
    pdf.line(x, y + 8, x + (label === 'Date' ? 60 : 85), y + 8)
    pdf.text(label, x, y + 12)
  }

  // Footer on every page, with the page count known.
  const pages = pdf.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    pdf.setPage(i)
    pdf.setDrawColor(RULE); pdf.line(M, H - 10, W - M, H - 10)
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(6.5); pdf.setTextColor(MUTED)
    pdf.text(`KIPL ProjectOS · Asset & inventory register · Generated ${at}${opts.generatedBy ? ` by ${opts.generatedBy}` : ''}`, M, H - 6)
    pdf.text(`Page ${i} of ${pages}`, W - M, H - 6, { align: 'right' })
  }
  return pdf
}

export function registerFileName(now = new Date()) {
  const d = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  return `KIPL-asset-register-${d}.pdf`
}
