/**
 * Critical Path Method scheduler.
 *
 * Durations and logic are the input; dates are the output. Nothing in here
 * reads a planned date to decide when an activity starts — that inversion is
 * what made the old engine reproduce whatever dates had been typed in.
 *
 * Properties the old engine did not have, each covered by a test:
 *
 *  - Integer day arithmetic in topological order, so the answer does not
 *    depend on the order the rows were stored in.
 *  - Every late finish is bounded by the project finish, so an activity that
 *    drives completion through a start-to-start successor is still critical.
 *  - A contract completion date can be imposed, so float goes negative when
 *    the forecast is late — the way a schedule says "you are late".
 *  - Invalid networks (loops, links to activities that do not exist, duplicate
 *    codes) are refused with an error, not quietly repaired.
 *  - WBS summaries are rolled up from their activities, never scheduled on
 *    their own duration.
 *  - Actual starts and finishes, and remaining work from the data date, drive
 *    the forecast. Completed work is not rescheduled.
 *  - Post-completion scope (free trial run, O&M) is scheduled but kept out of
 *    the contract network, so it cannot become the critical path.
 */

import { CalendarId, DayClock, isCalendarId } from './calendar'

export type RelType = 'FS' | 'SS' | 'FF' | 'SF'
export type Scope = 'contract' | 'post_completion'
export type ConstraintType = 'SNET' | 'FNLT'

export interface SchedLink { code: string; type: RelType; lag: number }

export interface SchedActivity {
  code: string
  title?: string
  /** Working days in the activity's calendar. Zero for a milestone. */
  duration: number
  isMilestone?: boolean
  parentCode?: string | null
  /** Predecessors. */
  links: SchedLink[]
  calendar?: CalendarId | null
  scope?: Scope | null
  constraint?: { type: ConstraintType; day: number } | null
  /** External "start no earlier than" floors, e.g. a pending approval. */
  floors?: number[]
  /** Day index of the actual start. */
  actualStart?: number | null
  /** Exclusive day index of the actual finish (the day after the last day worked). */
  actualFinish?: number | null
  percentComplete?: number | null
  /** Planned start index, used only to flag lags that were derived from dates. */
  plannedStart?: number | null
}

export interface ScheduleOptions {
  /** Work not yet started cannot start before this day. */
  dataDate: number
  /** Contract completion as an exclusive day index. Null = no deadline imposed. */
  mustFinishBy?: number | null
}

export type ActivityStatus = 'not_started' | 'in_progress' | 'complete'

export interface ScheduledActivity {
  code: string
  es: number
  ef: number
  ls: number
  lf: number
  /** Late finish minus early finish. Negative when the contract date cannot be met. */
  totalFloat: number
  freeFloat: number
  /** On the longest path to contract completion. */
  critical: boolean
  isSummary: boolean
  status: ActivityStatus
  remaining: number
  /** What set the early start: a predecessor's code, 'data-date', 'constraint', 'approval', 'actual' or 'project-start'. */
  drivenBy: string
}

export type IssueSeverity = 'error' | 'warning' | 'info'

export interface ScheduleIssue {
  severity: IssueSeverity
  rule: string
  activity?: string
  message: string
}

export interface ScheduleResult {
  ok: boolean
  issues: ScheduleIssue[]
  activities: Map<string, ScheduledActivity>
  /** Exclusive early finish of the contract scope. */
  forecastFinish: number | null
  /** Exclusive early finish of everything, trial run and O&M included. */
  overallFinish: number | null
  mustFinishBy: number | null
  /** Days late against the contract date; negative = days to spare. */
  contractVariance: number | null
  longestPath: string[]
}

const REL_TYPES: ReadonlySet<string> = new Set(['FS', 'SS', 'FF', 'SF'])

interface Edge { from: string; to: string; type: RelType; lag: number }

export function schedule(input: SchedActivity[], clock: DayClock, opts: ScheduleOptions): ScheduleResult {
  const issues: ScheduleIssue[] = []
  const err = (rule: string, message: string, activity?: string) => issues.push({ severity: 'error', rule, message, activity })
  const warn = (rule: string, message: string, activity?: string) => issues.push({ severity: 'warning', rule, message, activity })

  // ── Validate the register ──────────────────────────────────────────────
  const byCode = new Map<string, SchedActivity>()
  for (const a of input) {
    if (byCode.has(a.code)) err('duplicate-code', `Two activities share the code ${a.code}. Codes must be unique for logic to mean anything.`, a.code)
    else byCode.set(a.code, a)
    if (!Number.isInteger(a.duration) || a.duration < 0) err('bad-duration', `Duration must be a whole number of days, 0 or more (got ${a.duration}).`, a.code)
    if (a.isMilestone && a.duration > 0) warn('milestone-with-duration', `Marked as a milestone but carries ${a.duration} days. It is scheduled as a ${a.duration}-day activity.`, a.code)
  }

  // Children index — an activity with children is a WBS summary.
  const children = new Map<string, string[]>()
  for (const a of input) {
    if (a.parentCode && a.parentCode !== a.code) {
      if (!byCode.has(a.parentCode)) { warn('unknown-parent', `Parent ${a.parentCode} does not exist; treated as a top-level activity.`, a.code); continue }
      const list = children.get(a.parentCode) ?? []
      list.push(a.code)
      children.set(a.parentCode, list)
    }
  }
  const isSummary = (code: string) => (children.get(code)?.length ?? 0) > 0
  const leavesCache = new Map<string, string[]>()
  const leavesOf = (code: string, seen = new Set<string>()): string[] => {
    if (leavesCache.has(code)) return leavesCache.get(code)!
    if (seen.has(code)) return []
    seen.add(code)
    const kids = children.get(code)
    const out = !kids?.length ? [code] : kids.flatMap(k => leavesOf(k, seen))
    leavesCache.set(code, out)
    return out
  }

  for (const a of input) {
    for (const l of a.links ?? []) {
      if (!REL_TYPES.has(l.type)) err('bad-relationship', `Relationship "${l.type}" from ${l.code} is not FS, SS, FF or SF.`, a.code)
      if (!Number.isFinite(l.lag) || !Number.isInteger(l.lag)) err('bad-lag', `Lag from ${l.code} must be a whole number of days (got ${l.lag}).`, a.code)
      if (l.code === a.code) err('self-link', 'An activity cannot be its own predecessor.', a.code)
      else if (!byCode.has(l.code)) err('unknown-predecessor', `Predecessor ${l.code} does not exist. The link cannot be scheduled.`, a.code)
    }
  }
  if (issues.some(i => i.severity === 'error')) return failed(issues)

  // ── Expand logic onto leaf activities ──────────────────────────────────
  // A link from a summary means "from every activity in it"; a link to a
  // summary is inherited by every activity in it. Exact for FS and FF. For SS
  // and SF from a summary the expansion waits for the LAST start in it, which
  // is later than intended — flagged, because it should name an activity.
  const leaves = input.filter(a => !isSummary(a.code)).map(a => a.code)
  const edges: Edge[] = []
  const edgeKey = new Set<string>()
  for (const a of input) {
    for (const l of a.links ?? []) {
      if (isSummary(l.code) || isSummary(a.code)) {
        // FS and FF through a summary are exact ("after all of it"); note them.
        // SS and SF from a summary are ambiguous; warn.
        if (isSummary(l.code) && (l.type === 'SS' || l.type === 'SF')) {
          warn('summary-start-link', `${l.type} from summary ${l.code} is scheduled from the latest start inside it, which is later than a planner usually means. Link the activity that actually starts first.`, a.code)
        } else {
          issues.push({ severity: 'info', rule: 'summary-link', activity: a.code, message: `Link ${l.code} → ${a.code} runs through a WBS summary and applies to every activity inside it.` })
        }
      }
      for (const to of leavesOf(a.code)) {
        for (const from of leavesOf(l.code)) {
          if (from === to) continue
          const key = `${from}|${to}|${l.type}|${l.lag}`
          if (edgeKey.has(key)) continue
          edgeKey.add(key)
          edges.push({ from, to, type: l.type, lag: l.lag })
        }
      }
    }
  }
  const preds = new Map<string, Edge[]>(leaves.map(c => [c, []]))
  const succs = new Map<string, Edge[]>(leaves.map(c => [c, []]))
  for (const e of edges) { preds.get(e.to)!.push(e); succs.get(e.from)!.push(e) }

  // ── Topological order (Kahn). Anything left over is in a loop. ─────────
  const indeg = new Map<string, number>(leaves.map(c => [c, 0]))
  for (const e of edges) indeg.set(e.to, indeg.get(e.to)! + 1)
  // Sort the starting set so the result is deterministic regardless of input order.
  const queue = leaves.filter(c => indeg.get(c) === 0).sort()
  const order: string[] = []
  while (queue.length) {
    const c = queue.shift()!
    order.push(c)
    for (const e of succs.get(c)!) {
      indeg.set(e.to, indeg.get(e.to)! - 1)
      if (indeg.get(e.to) === 0) queue.push(e.to)
    }
  }
  if (order.length < leaves.length) {
    const stuck = new Set(leaves.filter(c => !order.includes(c)))
    err('logic-loop', `The logic loops back on itself through ${describeLoop(stuck, succs)}. A loop cannot be scheduled; break one of its links.`)
    return failed(issues)
  }

  // ── Scope, calendar, progress state ────────────────────────────────────
  const scopeOf = (c: string): Scope => (byCode.get(c)!.scope === 'post_completion' ? 'post_completion' : 'contract')
  const calOf = (c: string): CalendarId => {
    const cal = byCode.get(c)!.calendar
    return isCalendarId(cal) ? cal : 'seven_day'
  }
  const D = opts.dataDate

  for (const c of leaves) {
    const a = byCode.get(c)!
    if (scopeOf(c) === 'contract') {
      for (const e of preds.get(c)!) {
        if (scopeOf(e.from) === 'post_completion') {
          warn('contract-after-post-completion', `${c} is contract scope but follows ${e.from}, which is post-completion (trial run or O&M). Contract completion cannot wait for it.`, c)
        }
      }
    }
    for (const l of a.links ?? []) {
      if (l.lag < 0) warn('lead', `Negative lag (lead) of ${l.lag} days from ${l.code}. Leads hide logic; model the overlap with an SS link instead.`, c)
      const p = byCode.get(l.code)
      if (l.type === 'SS' && l.lag > 0 && a.plannedStart != null && p?.plannedStart != null && l.lag === a.plannedStart - p.plannedStart) {
        warn('date-derived-lag', `SS+${l.lag} from ${l.code} equals the gap between the two planned starts — the lag was derived from the dates, not from the work. Re-enter the logic.`, c)
      }
    }
  }

  // ── Forward pass ────────────────────────────────────────────────────────
  const ES = new Map<string, number>()
  const EF = new Map<string, number>()
  const REM = new Map<string, number>()
  const STATUS = new Map<string, ActivityStatus>()
  const DRIVEN = new Map<string, string>()
  /** Early start before snapping to a working day — what the logic alone produced. */
  const LOGIC_ES = new Map<string, number>()
  let lateStarts = 0

  for (const c of order) {
    const a = byCode.get(c)!
    const cal = calOf(c)
    const dur = a.duration
    const pct = Math.max(0, Math.min(100, Number(a.percentComplete) || 0))
    const hasStart = a.actualStart != null
    const done = a.actualFinish != null

    if (done) {
      const ef = a.actualFinish!
      const es = hasStart ? a.actualStart! : clock.subtract(cal, ef, dur)
      ES.set(c, es); EF.set(c, ef); REM.set(c, 0); STATUS.set(c, 'complete'); DRIVEN.set(c, 'actual')
      continue
    }

    if (hasStart) {
      // In progress: the remaining work runs from the data date. Its
      // predecessors have already released it, so logic does not re-hold it.
      const es = a.actualStart!
      const remaining = Math.max(0, Math.round(dur * (1 - pct / 100)))
      const resume = Math.max(D, es)
      ES.set(c, es)
      EF.set(c, remaining === 0 ? resume : clock.add(cal, clock.nextWorking(cal, resume), remaining))
      REM.set(c, remaining); STATUS.set(c, 'in_progress'); DRIVEN.set(c, 'actual')
      continue
    }

    let es = 0
    let driver = 'project-start'
    const consider = (cand: number, why: string) => { if (cand > es) { es = cand; driver = why } }
    for (const e of preds.get(c)!) {
      const pes = ES.get(e.from)!, pef = EF.get(e.from)!
      switch (e.type) {
        case 'FS': consider(pef + e.lag, e.from); break
        case 'SS': consider(pes + e.lag, e.from); break
        case 'FF': consider(clock.subtract(cal, pef + e.lag, dur), e.from); break
        case 'SF': consider(clock.subtract(cal, pes + e.lag, dur), e.from); break
      }
    }
    for (const f of a.floors ?? []) consider(f, 'approval')
    if (a.constraint?.type === 'SNET') consider(a.constraint.day, 'constraint')
    if (D > es) {
      lateStarts++
      consider(D, 'data-date')
    }
    LOGIC_ES.set(c, es)
    if (dur > 0) es = clock.nextWorking(cal, es)
    ES.set(c, es)
    EF.set(c, clock.add(cal, es, dur))
    REM.set(c, dur); STATUS.set(c, 'not_started'); DRIVEN.set(c, driver)
  }

  const contractLeaves = leaves.filter(c => scopeOf(c) === 'contract')
  const forecastFinish = contractLeaves.length ? Math.max(...contractLeaves.map(c => EF.get(c)!)) : null
  const overallFinish = leaves.length ? Math.max(...leaves.map(c => EF.get(c)!)) : null
  const mustFinishBy = opts.mustFinishBy ?? null

  // ── Backward pass ───────────────────────────────────────────────────────
  // Every activity's late finish starts at its scope's finish and can only
  // come down from there — so an activity whose finish no successor
  // constrains is still bounded by the end of the project.
  const contractBound = mustFinishBy ?? forecastFinish ?? 0
  const postBound = overallFinish ?? 0
  const LS = new Map<string, number>()
  const LF = new Map<string, number>()
  for (let i = order.length - 1; i >= 0; i--) {
    const c = order[i]
    const a = byCode.get(c)!
    const cal = calOf(c)
    const workLeft = STATUS.get(c) === 'in_progress' ? REM.get(c)! : a.duration
    let lf = scopeOf(c) === 'contract' ? contractBound : Math.max(postBound, EF.get(c)!)
    for (const e of succs.get(c)!) {
      // The trial run and O&M follow completion; they cannot take float away from it.
      if (scopeOf(c) === 'contract' && scopeOf(e.to) === 'post_completion') continue
      const sls = LS.get(e.to)!, slf = LF.get(e.to)!
      let cand: number
      switch (e.type) {
        case 'FS': cand = sls - e.lag; break
        case 'FF': cand = slf - e.lag; break
        case 'SS': cand = clock.add(cal, sls - e.lag, workLeft); break
        case 'SF': cand = clock.add(cal, slf - e.lag, workLeft); break
      }
      if (cand < lf) lf = cand
    }
    if (a.constraint?.type === 'FNLT' && a.constraint.day < lf) lf = a.constraint.day
    if (STATUS.get(c) === 'complete') { LF.set(c, EF.get(c)!); LS.set(c, ES.get(c)!); continue }
    LF.set(c, lf)
    LS.set(c, clock.subtract(cal, lf, workLeft))
  }

  // ── Free float ──────────────────────────────────────────────────────────
  const FF = new Map<string, number>()
  for (const c of leaves) {
    const bound = scopeOf(c) === 'contract' ? contractBound : postBound
    let ff = bound - EF.get(c)!
    for (const e of succs.get(c)!) {
      if (scopeOf(c) === 'contract' && scopeOf(e.to) === 'post_completion') continue
      const s = e.to
      let slack: number
      switch (e.type) {
        case 'FS': slack = ES.get(s)! - e.lag - EF.get(c)!; break
        case 'SS': slack = ES.get(s)! - e.lag - ES.get(c)!; break
        case 'FF': slack = EF.get(s)! - e.lag - EF.get(c)!; break
        case 'SF': slack = EF.get(s)! - e.lag - ES.get(c)!; break
      }
      if (slack < ff) ff = slack
    }
    FF.set(c, Math.max(STATUS.get(c) === 'complete' ? 0 : -Infinity, ff))
  }

  // ── Longest path ────────────────────────────────────────────────────────
  // Walk back from the contract finish through the relationships that set
  // each activity's early date. This is P6's "longest path": it does not
  // depend on a float threshold, so it still names the controlling chain
  // when the contract date has slack or is already blown.
  const onPath = new Set<string>()
  if (forecastFinish !== null) {
    const stack = contractLeaves.filter(c => EF.get(c) === forecastFinish && STATUS.get(c) !== 'complete')
    while (stack.length) {
      const c = stack.pop()!
      if (onPath.has(c)) continue
      onPath.add(c)
      if (STATUS.get(c) !== 'not_started') continue
      const cal = calOf(c)
      const dur = byCode.get(c)!.duration
      const logicEs = LOGIC_ES.get(c)!
      for (const e of preds.get(c)!) {
        const pes = ES.get(e.from)!, pef = EF.get(e.from)!
        let drives = false
        switch (e.type) {
          case 'FS': drives = pef + e.lag >= logicEs; break
          case 'SS': drives = pes + e.lag >= logicEs; break
          case 'FF': drives = clock.subtract(cal, pef + e.lag, dur) >= logicEs; break
          case 'SF': drives = clock.subtract(cal, pes + e.lag, dur) >= logicEs; break
        }
        if (drives && STATUS.get(e.from) !== 'complete') stack.push(e.from)
      }
    }
  }

  // ── Assemble, then roll summaries up from their activities ──────────────
  const out = new Map<string, ScheduledActivity>()
  for (const c of leaves) {
    out.set(c, {
      code: c,
      es: ES.get(c)!, ef: EF.get(c)!, ls: LS.get(c)!, lf: LF.get(c)!,
      totalFloat: STATUS.get(c) === 'complete' ? 0 : LF.get(c)! - EF.get(c)!,
      freeFloat: FF.get(c)!,
      critical: onPath.has(c),
      isSummary: false,
      status: STATUS.get(c)!,
      remaining: REM.get(c)!,
      drivenBy: DRIVEN.get(c)!,
    })
  }
  for (const a of input) {
    if (!isSummary(a.code)) continue
    const kids = leavesOf(a.code).map(k => out.get(k)!).filter(Boolean)
    if (!kids.length) continue
    const statuses = new Set(kids.map(k => k.status))
    out.set(a.code, {
      code: a.code,
      es: Math.min(...kids.map(k => k.es)), ef: Math.max(...kids.map(k => k.ef)),
      ls: Math.min(...kids.map(k => k.ls)), lf: Math.max(...kids.map(k => k.lf)),
      totalFloat: Math.min(...kids.map(k => k.totalFloat)),
      freeFloat: Math.min(...kids.map(k => k.freeFloat)),
      critical: kids.some(k => k.critical),
      isSummary: true,
      status: statuses.size === 1 ? kids[0].status : 'in_progress',
      remaining: Math.max(...kids.map(k => k.remaining)),
      drivenBy: 'summary',
    })
  }

  // ── Network-quality warnings (the DCMA-style checks) ────────────────────
  for (const c of contractLeaves) {
    const a = byCode.get(c)!
    // One start milestone (contract commencement) may stand alone; everything
    // else needs a predecessor, or its start is decided by nothing.
    const startMilestone = a.duration === 0
    if (!startMilestone && preds.get(c)!.length === 0 && (a.links ?? []).length === 0) {
      warn('open-start', 'No predecessor. Only the commencement milestone should start from nothing; tie this to what it depends on.', c)
    }
    const contractSuccs = succs.get(c)!.filter(e => scopeOf(e.to) === 'contract')
    if (contractSuccs.length === 0 && EF.get(c)! < (forecastFinish ?? 0)) {
      warn('open-end', 'No successor in the contract network. Finish it late and nothing downstream moves; tie it to what depends on it.', c)
    }
  }
  if (lateStarts > 0) {
    issues.push({ severity: 'info', rule: 'no-actual-start', message: `${lateStarts} not-started ${lateStarts === 1 ? 'activity was' : 'activities were'} due to start before the data date. With no actual start recorded, the forecast holds them at the data date — record actual starts to correct it.` })
  }

  const longestPath = order.filter(c => onPath.has(c))
  return {
    ok: true,
    issues,
    activities: out,
    forecastFinish,
    overallFinish,
    mustFinishBy,
    contractVariance: forecastFinish !== null && mustFinishBy !== null ? forecastFinish - mustFinishBy : null,
    longestPath,
  }
}

function failed(issues: ScheduleIssue[]): ScheduleResult {
  return {
    ok: false, issues, activities: new Map(), forecastFinish: null, overallFinish: null,
    mustFinishBy: null, contractVariance: null, longestPath: [],
  }
}

/** Name one concrete loop among the activities Kahn's algorithm could not order. */
function describeLoop(stuck: Set<string>, succs: Map<string, Edge[]>): string {
  const start = [...stuck].sort()[0]
  const path: string[] = [start]
  const seen = new Set([start])
  let cur = start
  for (let guard = 0; guard < stuck.size + 1; guard++) {
    const next = succs.get(cur)!.map(e => e.to).find(t => stuck.has(t))
    if (!next) break
    if (seen.has(next)) {
      const from = path.indexOf(next)
      return [...path.slice(from), next].join(' → ')
    }
    path.push(next); seen.add(next); cur = next
  }
  return [...stuck].sort().join(', ')
}
