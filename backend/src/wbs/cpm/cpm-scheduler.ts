/**
 * Pure, tested Critical Path Method (CPM) Scheduler module.
 *
 * Implements the standard Precedence Diagramming Method (PDM) supporting:
 * - Four relationship types: Finish-to-Start (FS), Start-to-Start (SS),
 *   Finish-to-Finish (FF), and Start-to-Finish (SF).
 * - Integer or fractional lags (positive = lag, negative = lead).
 * - Arbitrary acyclic networks, multi-predecessor (merge) and multi-successor (burst) nodes.
 * - Earliest Start floors (e.g. Liaison approval gating, statutory permits, physical site possession).
 * - Fixed contract completion boundaries (e.g. 912 days capital works target).
 * - Cycle detection and graceful fallback.
 * - Total Float (TF), Free Float (FF), and Critical Path detection.
 * - Zero external framework dependencies.
 */

export type DependencyType = 'FS' | 'SS' | 'FF' | 'SF'

export interface CpmDependency {
  predecessorId: string
  type?: DependencyType
  lag?: number
}

export interface CpmActivityInput {
  id: string
  duration: number
  plannedStartDay?: number
  isMilestone?: boolean
  dependencies?: CpmDependency[]
  earliestStartFloor?: number
  actualStartDay?: number
}

export interface CpmActivityResult {
  id: string
  duration: number
  earlyStart: number
  earlyFinish: number
  lateStart: number
  lateFinish: number
  totalFloat: number
  freeFloat: number
  isCritical: boolean
  drivingPredecessors: string[]
}

export interface CpmOptions {
  /** Fixed target project duration in days (e.g. 912). If omitted, max(EF) is used */
  targetDuration?: number
  /** Whether to exclude milestones from being marked isCritical */
  excludeMilestonesFromCritical?: boolean
  /** Default start day if an activity has no predecessors and no plannedStart */
  defaultStartDay?: number
}

export interface CpmScheduleResult {
  activities: Map<string, CpmActivityResult>
  projectDuration: number
  criticalPath: string[]
  hasCycle: boolean
  cycleNodes?: string[]
}

export function calculateCpm(
  activities: CpmActivityInput[],
  options: CpmOptions = {},
): CpmScheduleResult {
  const byId = new Map<string, CpmActivityInput>()
  activities.forEach(a => byId.set(a.id, a))

  // Successors and Predecessors Maps
  const predMap = new Map<string, { predId: string; type: DependencyType; lag: number }[]>()
  const succMap = new Map<string, { succId: string; type: DependencyType; lag: number }[]>()

  for (const a of activities) {
    predMap.set(a.id, [])
    if (!succMap.has(a.id)) succMap.set(a.id, [])
  }

  for (const a of activities) {
    const deps = a.dependencies ?? []
    for (const d of deps) {
      if (!d || !d.predecessorId) continue
      const type = d.type ?? 'FS'
      const lag = Number(d.lag) || 0
      predMap.get(a.id)!.push({ predId: d.predecessorId, type, lag })
      if (!succMap.has(d.predecessorId)) succMap.set(d.predecessorId, [])
      succMap.get(d.predecessorId)!.push({ succId: a.id, type, lag })
    }
  }

  // ── Cycle Detection & Topological Sort (Kahn's algorithm) ─────────────────
  const inDegree = new Map<string, number>()
  for (const a of activities) {
    const validPreds = (predMap.get(a.id) ?? []).filter(p => byId.has(p.predId))
    inDegree.set(a.id, validPreds.length)
  }

  const queue: string[] = []
  for (const [id, deg] of inDegree.entries()) {
    if (deg === 0) queue.push(id)
  }

  const topoOrder: string[] = []
  while (queue.length > 0) {
    const u = queue.shift()!
    topoOrder.push(u)
    for (const edge of succMap.get(u) ?? []) {
      if (!byId.has(edge.succId)) continue
      const newDeg = (inDegree.get(edge.succId) ?? 1) - 1
      inDegree.set(edge.succId, newDeg)
      if (newDeg === 0) queue.push(edge.succId)
    }
  }

  const hasCycle = topoOrder.length < activities.length
  let cycleNodes: string[] | undefined
  if (hasCycle) {
    cycleNodes = activities.map(a => a.id).filter(id => !topoOrder.includes(id))
  }

  // ── Forward Pass ─────────────────────────────────────────────────────────
  const esMap = new Map<string, number>()
  const efMap = new Map<string, number>()
  const drivingPredsMap = new Map<string, string[]>()

  // Evaluation list: follow topological order, then append any cyclic nodes to prevent stalling
  const evalOrder = hasCycle ? [...topoOrder, ...cycleNodes!] : topoOrder

  for (const id of evalOrder) {
    const a = byId.get(id)!
    const dur = Math.max(0, Number(a.duration) || 0)
    const preds = (predMap.get(id) ?? []).filter(p => byId.has(p.predId))

    // Base early start: if no predecessors, anchor to plannedStartDay (or default)
    let earlyStart = preds.length === 0
      ? Math.max(0, a.plannedStartDay ?? options.defaultStartDay ?? 0)
      : 0

    const driving: string[] = []
    let maxConstraint = earlyStart

    for (const edge of preds) {
      const predES = esMap.get(edge.predId) ?? (byId.get(edge.predId)?.plannedStartDay ?? 0)
      const predEF = efMap.get(edge.predId) ?? (predES + (byId.get(edge.predId)?.duration ?? 0))
      let candES: number

      switch (edge.type) {
        case 'SS':
          candES = predES + edge.lag
          break
        case 'FF':
          candES = predEF + edge.lag - dur
          break
        case 'SF':
          candES = predES + edge.lag - dur
          break
        case 'FS':
        default:
          candES = predEF + edge.lag
          break
      }

      if (candES > maxConstraint) {
        maxConstraint = candES
        driving.length = 0
        driving.push(edge.predId)
      } else if (candES === maxConstraint && candES > earlyStart) {
        driving.push(edge.predId)
      }
    }

    earlyStart = maxConstraint

    // External statutory or approval floor constraint
    if (a.earliestStartFloor !== undefined && a.earliestStartFloor > earlyStart) {
      earlyStart = a.earliestStartFloor
    }

    // Actual start date constraint (if already started)
    if (a.actualStartDay !== undefined) {
      earlyStart = Math.max(earlyStart, a.actualStartDay)
    }

    earlyStart = Math.max(0, earlyStart)
    const earlyFinish = a.isMilestone ? earlyStart : earlyStart + dur

    esMap.set(id, earlyStart)
    efMap.set(id, earlyFinish)
    drivingPredsMap.set(id, driving)
  }

  // Calculate project duration
  const naturalDuration = activities.length > 0
    ? Math.max(...activities.map(a => efMap.get(a.id) ?? 0))
    : 0

  const projectDuration = options.targetDuration !== undefined
    ? Math.max(options.targetDuration, naturalDuration)
    : naturalDuration

  // ── Backward Pass ────────────────────────────────────────────────────────
  const lsMap = new Map<string, number>()
  const lfMap = new Map<string, number>()

  const reverseOrder = [...evalOrder].reverse()

  for (const id of reverseOrder) {
    const a = byId.get(id)!
    const dur = Math.max(0, Number(a.duration) || 0)
    const succs = (succMap.get(id) ?? []).filter(s => byId.has(s.succId))

    let lateFinish = projectDuration

    if (succs.length > 0) {
      let minConstraint = Infinity

      for (const edge of succs) {
        const succLS = lsMap.get(edge.succId) ?? projectDuration
        const succLF = lfMap.get(edge.succId) ?? projectDuration
        let candLF: number

        switch (edge.type) {
          case 'SS':
            candLF = succLS - edge.lag + dur
            break
          case 'FF':
            candLF = succLF - edge.lag
            break
          case 'SF':
            candLF = succLF - edge.lag + dur
            break
          case 'FS':
          default:
            candLF = succLS - edge.lag
            break
        }

        minConstraint = Math.min(minConstraint, candLF)
      }

      lateFinish = minConstraint === Infinity ? projectDuration : minConstraint
    }

    const lateStart = a.isMilestone ? lateFinish : lateFinish - dur
    lfMap.set(id, lateFinish)
    lsMap.set(id, lateStart)
  }

  // ── Floats & Critical Path ───────────────────────────────────────────────
  const results = new Map<string, CpmActivityResult>()
  const criticalPath: string[] = []

  for (const a of activities) {
    const es = esMap.get(a.id) ?? 0
    const ef = efMap.get(a.id) ?? 0
    const ls = lsMap.get(a.id) ?? 0
    const lf = lfMap.get(a.id) ?? 0
    const dur = Math.max(0, Number(a.duration) || 0)

    const totalFloat = ls - es

    // Free float calculation: min(early start of successors) - ef
    const succs = (succMap.get(a.id) ?? []).filter(s => byId.has(s.succId))
    let freeFloat = 0
    if (succs.length === 0) {
      freeFloat = Math.max(0, projectDuration - ef)
    } else {
      let minSuccEarly = Infinity
      for (const edge of succs) {
        const sES = esMap.get(edge.succId) ?? 0
        let reqEF: number
        switch (edge.type) {
          case 'SS':
            reqEF = sES - edge.lag + dur
            break
          case 'FF':
            reqEF = (efMap.get(edge.succId) ?? 0) - edge.lag
            break
          case 'FS':
          default:
            reqEF = sES - edge.lag
            break
        }
        minSuccEarly = Math.min(minSuccEarly, reqEF)
      }
      freeFloat = minSuccEarly !== Infinity ? Math.max(0, minSuccEarly - ef) : 0
    }

    const excludeMs = options.excludeMilestonesFromCritical ?? true
    const isCritical = totalFloat <= 0 && (!excludeMs || !a.isMilestone)

    if (isCritical) {
      criticalPath.push(a.id)
    }

    results.set(a.id, {
      id: a.id,
      duration: dur,
      earlyStart: es,
      earlyFinish: ef,
      lateStart: ls,
      lateFinish: lf,
      totalFloat,
      freeFloat,
      isCritical,
      drivingPredecessors: drivingPredsMap.get(a.id) ?? [],
    })
  }

  return {
    activities: results,
    projectDuration,
    criticalPath,
    hasCycle,
    cycleNodes,
  }
}
