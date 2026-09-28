/**
 * Layout for the CPM views: a time-scaled logic Gantt and a layered network
 * diagram. Pure functions over the rows GET /wbs/cpm returns, so they can be
 * tested without a browser and reused by the PDF export.
 */

export interface CpmDep { code: string; type: 'FS' | 'SS' | 'FF' | 'SF'; lag: number }

export interface CpmRow {
  id?: string
  wbsCode: string
  title: string
  level?: number
  parentId?: string | null
  isMilestone?: boolean
  isSummary?: boolean
  scope?: 'contract' | 'post_completion'
  dependencies?: CpmDep[]
  duration: number
  plannedStart?: string | null
  plannedEnd?: string | null
  forecastStart?: string | null
  forecastFinish?: string | null
  status?: string | null
  progressPct?: number
  es?: number | null
  ef?: number | null
  ls?: number | null
  lf?: number | null
  float?: number | null
  freeFloat?: number | null
  isCritical?: boolean
  /** What sets the forecast start: a predecessor's code, 'data-date', 'approval', 'actual'… */
  drivenBy?: string | null
}

const DAY = 86_400_000
export const parseIso = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10))
export const isoOf = (t: number) => new Date(t).toISOString().slice(0, 10)
export const addDaysIso = (iso: string, n: number) => isoOf(parseIso(iso) + n * DAY)
export const daysBetween = (a: string, b: string) => Math.round((parseIso(b) - parseIso(a)) / DAY)

/** Natural order for WBS codes: 0.2 < 0.10, 2 < 10, 2 < 2.1. Letters after numbers. */
export function compareCodes(a: string, b: string): number {
  const pa = a.split('.'), pb = b.split('.')
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i], y = pb[i]
    if (x === undefined) return -1
    if (y === undefined) return 1
    const nx = /^\d+$/.test(x), ny = /^\d+$/.test(y)
    if (nx && ny && +x !== +y) return +x - +y
    if (nx !== ny) return nx ? -1 : 1
    if (x !== y) return x < y ? -1 : 1
  }
  return 0
}

/** Parent code of a row; a parent link may hold the parent's code or its id. */
export function parentCodeOf(row: CpmRow, rows: CpmRow[]): string | null {
  if (!row.parentId) return null
  if (rows.some(r => r.wbsCode === row.parentId)) return row.parentId
  return rows.find(r => r.id === row.parentId)?.wbsCode ?? null
}

/**
 * Rows in reading order: each package followed by its activities, packages in
 * the order they come from the programme, activities inside a package by code.
 */
export function orderRows(rows: CpmRow[]): Array<CpmRow & { depth: number }> {
  const kids = new Map<string, CpmRow[]>()
  const top: CpmRow[] = []
  for (const r of rows) {
    const p = parentCodeOf(r, rows)
    if (p) kids.set(p, [...(kids.get(p) ?? []), r])
    else top.push(r)
  }
  const out: Array<CpmRow & { depth: number }> = []
  const walk = (r: CpmRow, depth: number) => {
    out.push({ ...r, depth })
    for (const k of [...(kids.get(r.wbsCode) ?? [])].sort((a, b) => compareCodes(a.wbsCode, b.wbsCode))) walk(k, depth + 1)
  }
  for (const r of top) walk(r, 0)
  return out
}

export interface Tick { x: number; label: string; major: boolean }

/** A linear date scale with month ticks and year labels. */
export function timeScale(fromIso: string, toIso: string, width: number) {
  const t0 = parseIso(fromIso)
  const span = Math.max(1, parseIso(toIso) - t0)
  const x = (iso: string) => ((parseIso(iso) - t0) / span) * width
  const xDay = (days: number) => ((days * DAY) / span) * width
  const ticks: Tick[] = []
  const d = new Date(t0)
  let cur = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)
  const pxPerMonth = (30 * DAY / span) * width
  const every = pxPerMonth >= 36 ? 1 : pxPerMonth >= 18 ? 3 : 6
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  while (cur <= parseIso(toIso)) {
    const dt = new Date(cur)
    const m = dt.getUTCMonth()
    if (m % every === 0 || m === 0) {
      ticks.push({
        x: ((cur - t0) / span) * width,
        label: m === 0 ? String(dt.getUTCFullYear()) : MONTHS[m],
        major: m === 0,
      })
    }
    cur = Date.UTC(dt.getUTCFullYear(), m + 1, 1)
  }
  return { x, xDay, ticks, pxPerDay: xDay(1) }
}

/** The date span every bar, plan and float tail fits inside, with a little air. */
export function chartSpan(rows: CpmRow[], extra: (string | null | undefined)[] = []): { from: string; to: string } {
  const dates: string[] = []
  for (const r of rows) {
    for (const d of [r.forecastStart, r.forecastFinish, r.plannedStart, r.plannedEnd]) if (d) dates.push(String(d).slice(0, 10))
  }
  for (const d of extra) if (d) dates.push(String(d).slice(0, 10))
  if (!dates.length) {
    const today = isoOf(Date.now())
    return { from: today, to: addDaysIso(today, 365) }
  }
  dates.sort()
  return { from: addDaysIso(dates[0], -14), to: addDaysIso(dates[dates.length - 1], 45) }
}

/** Leaf activities under a code (the code itself if it has none). */
export function leavesOf(code: string, rows: CpmRow[]): string[] {
  const kids = rows.filter(r => parentCodeOf(r, rows) === code)
  return kids.length ? kids.flatMap(k => leavesOf(k.wbsCode, rows)) : [code]
}

export interface NetEdge { from: string; to: string; type: string; lag: number; critical: boolean }

/**
 * Links between leaf activities. A link to or from a WBS summary stands for
 * every activity inside it, exactly as the scheduler treats it.
 */
export function networkEdges(rows: CpmRow[]): NetEdge[] {
  const byCode = new Map(rows.map(r => [r.wbsCode, r]))
  const seen = new Set<string>()
  const edges: NetEdge[] = []
  for (const r of rows) {
    for (const d of r.dependencies ?? []) {
      if (!byCode.has(d.code)) continue
      for (const to of leavesOf(r.wbsCode, rows)) {
        for (const from of leavesOf(d.code, rows)) {
          const key = `${from}>${to}`
          if (from === to || seen.has(key)) continue
          seen.add(key)
          edges.push({
            from, to, type: d.type, lag: d.lag,
            critical: !!(byCode.get(from)?.isCritical && byCode.get(to)?.isCritical),
          })
        }
      }
    }
  }
  return edges
}

export interface NetNode { code: string; col: number; row: number; x: number; y: number }

/**
 * Layered layout: every activity sits in the column after its latest
 * predecessor, so every arrow runs left to right. Inside a column the critical
 * activities come first — the longest path reads as one straight red spine
 * along the top — and the rest are ordered by the average row of their
 * predecessors to keep crossings down.
 */
export function networkLayout(rows: CpmRow[], box = { w: 176, h: 78, gapX: 56, gapY: 22 }) {
  const leaves = rows.filter(r => !r.isSummary && !rows.some(k => parentCodeOf(k, rows) === r.wbsCode))
  const codes = new Set(leaves.map(r => r.wbsCode))
  const edges = networkEdges(rows).filter(e => codes.has(e.from) && codes.has(e.to))
  const preds = new Map<string, string[]>()
  for (const e of edges) preds.set(e.to, [...(preds.get(e.to) ?? []), e.from])

  const col = new Map<string, number>()
  const visiting = new Set<string>()
  const colOf = (c: string): number => {
    if (col.has(c)) return col.get(c)!
    if (visiting.has(c)) return 0 // a loop; the scheduler reports it
    visiting.add(c)
    const p = preds.get(c) ?? []
    const v = p.length ? Math.max(...p.map(colOf)) + 1 : 0
    visiting.delete(c)
    col.set(c, v)
    return v
  }
  leaves.forEach(r => colOf(r.wbsCode))

  const byCol = new Map<number, CpmRow[]>()
  for (const r of leaves) byCol.set(col.get(r.wbsCode)!, [...(byCol.get(col.get(r.wbsCode)!) ?? []), r])
  const rowOf = new Map<string, number>()
  const cols = [...byCol.keys()].sort((a, b) => a - b)
  for (const c of cols) {
    const items = byCol.get(c)!
    const bary = (r: CpmRow) => {
      const p = (preds.get(r.wbsCode) ?? []).map(x => rowOf.get(x)).filter((v): v is number => v !== undefined)
      return p.length ? p.reduce((a, b) => a + b, 0) / p.length : Infinity
    }
    items.sort((a, b) =>
      Number(!!b.isCritical) - Number(!!a.isCritical)
      || bary(a) - bary(b)
      || (a.es ?? 0) - (b.es ?? 0)
      || compareCodes(a.wbsCode, b.wbsCode))
    items.forEach((r, i) => rowOf.set(r.wbsCode, i))
  }

  const nodes: NetNode[] = leaves.map(r => {
    const c = col.get(r.wbsCode)!, rw = rowOf.get(r.wbsCode)!
    return { code: r.wbsCode, col: c, row: rw, x: c * (box.w + box.gapX), y: rw * (box.h + box.gapY) }
  })
  const maxCol = Math.max(0, ...nodes.map(n => n.col))
  const maxRow = Math.max(0, ...nodes.map(n => n.row))
  return {
    nodes, edges, box,
    width: (maxCol + 1) * (box.w + box.gapX) - box.gapX,
    height: (maxRow + 1) * (box.h + box.gapY) - box.gapY,
  }
}

/** A smooth left-to-right connector from the right edge of one box to the left edge of another. */
export function connectorPath(x1: number, y1: number, x2: number, y2: number): string {
  const dx = Math.max(24, (x2 - x1) / 2)
  return `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`
}

/** "+353 days late", "12 days to spare", "on the contract date". */
export function describeVariance(days: number | null | undefined): { text: string; tone: 'late' | 'early' | 'even' | 'unknown' } {
  if (days === null || days === undefined) return { text: 'not computed', tone: 'unknown' }
  if (days > 0) return { text: `${days} day${days === 1 ? '' : 's'} late`, tone: 'late' }
  if (days < 0) return { text: `${-days} day${days === -1 ? '' : 's'} to spare`, tone: 'early' }
  return { text: 'on the contract date', tone: 'even' }
}

/** A row of GET /wbs (the stored activity plus its live forecast) in the shape the CPM views draw. */
export function rowFromTask(t: any): CpmRow {
  return {
    id: t.id, wbsCode: t.wbsCode, title: t.title, level: t.level, parentId: t.parentId ?? null,
    isMilestone: !!t.isMilestone, isSummary: !!t.isSummary, scope: t.scheduleScope ?? 'contract',
    dependencies: Array.isArray(t.dependencies) ? t.dependencies : [],
    duration: Number(t.plannedDuration) || 0,
    plannedStart: t.plannedStart ?? null, plannedEnd: t.plannedEnd ?? null,
    forecastStart: t.forecastStart ?? null, forecastFinish: t.forecastFinish ?? null,
    status: t.scheduleStatus ?? null, progressPct: Number(t.progressPct) || 0,
    es: t.earliestStart ?? null, ef: t.earliestFinish ?? null, ls: t.latestStart ?? null, lf: t.latestFinish ?? null,
    float: t.totalFloat ?? null, freeFloat: t.freeFloat ?? null, isCritical: !!t.isCritical,
    drivenBy: t.drivenBy ?? null,
  }
}

/**
 * Progress of every row, with each WBS package rolled up from its own
 * activities weighted by duration — a package's stored figure is never typed
 * in and would otherwise read 0%.
 */
export function rolledUpProgress(rows: CpmRow[]): Map<string, number> {
  const out = new Map<string, number>()
  const visit = (code: string): { pct: number; weight: number } => {
    const kids = rows.filter(r => parentCodeOf(r, rows) === code)
    const self = rows.find(r => r.wbsCode === code)!
    if (!kids.length) {
      const pct = Math.max(0, Math.min(100, Number(self.progressPct) || 0))
      out.set(code, pct)
      return { pct, weight: self.isMilestone ? 0 : Math.max(1, self.duration) }
    }
    const parts = kids.map(k => visit(k.wbsCode))
    const weight = parts.reduce((s, p) => s + p.weight, 0)
    const pct = weight ? parts.reduce((s, p) => s + p.pct * p.weight, 0) / weight : 0
    out.set(code, pct)
    return { pct, weight }
  }
  for (const r of rows) if (!parentCodeOf(r, rows)) visit(r.wbsCode)
  return out
}

/**
 * Clause 16.3 stages on the calendar: the share of the work due at each
 * quarter of the contract time, counted from the start in calendar days
 * exactly as the backend counts them.
 */
export function clause16Checkpoints(start: string, completion: string) {
  const total = daysBetween(start, completion)
  return [
    { fraction: 0.25, pct: 12.5, name: '¼ time' },
    { fraction: 0.5, pct: 37.5, name: '½ time' },
    { fraction: 0.75, pct: 75, name: '¾ time' },
  ].map(s => ({
    date: addDaysIso(start, Math.round(total * s.fraction)),
    label: `16.3 · ${s.pct}%`,
    title: `Clause 16.3 — ${s.name}: at least ${s.pct}% of the work is due by ${addDaysIso(start, Math.round(total * s.fraction))}`,
  }))
}
