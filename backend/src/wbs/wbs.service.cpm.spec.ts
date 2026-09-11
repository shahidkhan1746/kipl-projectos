import { WbsService } from './wbs.service'

/**
 * Covers the CPM engine in WbsService.recalculate() — the forward pass, the
 * backward pass, total float, and critical-path selection — plus the two
 * inputs that feed it: PERT duration expansion and the Liaison approval floor.
 *
 * Durations are chosen as multiples of 30 because PERT expands a duration M to
 * TE = (0.9M + 4M + 1.3M) / 6 = 1.0333M, which lands on an integer there:
 *
 *   M=30 -> TE=31    M=60 -> TE=62    M=90 -> TE=93
 *
 * Scheduling uses TE, never M, so the expected day numbers below are all in
 * TE-days measured from PROJECT_START (2025-11-07).
 */

const PROJECT_START = '2025-11-07'

type TaskOpts = Partial<{
  dependencies: { code: string; type: string; lag: number }[]
  predecessors: string
  plannedStart: string
  delayDays: number
  isMilestone: boolean
  parentId: string | null
}>

const T = (wbsCode: string, plannedDuration: number, opts: TaskOpts = {}) =>
  ({
    wbsCode,
    plannedDuration,
    plannedStart: PROJECT_START,
    plannedEnd: PROJECT_START,
    dependencies: [],
    predecessors: '',
    delayDays: 0,
    isMilestone: false,
    parentId: null,
    ...opts,
  }) as any

/** Builds the service over in-memory repositories. recalculate() mutates the
 *  task objects in place before saving, so callers assert on `tasks` directly. */
const build = (tasks: any[], liaisonFiles: any[] = []) => {
  const repo = { find: jest.fn().mockResolvedValue(tasks), save: jest.fn().mockResolvedValue(tasks) }
  const liaisonRepo = { find: jest.fn().mockResolvedValue(liaisonFiles) }
  return { svc: new WbsService(repo as any, liaisonRepo as any), repo }
}

const byCode = (tasks: any[]) => new Map(tasks.map(t => [t.wbsCode, t]))

describe('WbsService.recalculate — PERT duration expansion', () => {
  it('expands a planned duration into the O/M/P/TE/variance/SD set', async () => {
    const tasks = [T('A', 30)]
    const { svc } = build(tasks)
    await svc.recalculate('p1')

    const a = tasks[0]
    expect(a.optimisticDuration).toBe(27) // 0.9 x 30
    expect(a.mostLikelyDuration).toBe(30)
    expect(a.pessimisticDuration).toBe(39) // 1.3 x 30
    expect(a.expectedDuration).toBe(31) // (27 + 120 + 39) / 6
    expect(a.variance).toBe(4) // ((39 - 27) / 6)^2
    expect(a.standardDeviation).toBe(2)
  })

  it('inflates the pessimistic estimate by recorded delay days', async () => {
    const tasks = [T('A', 30, { delayDays: 6 })]
    const { svc } = build(tasks)
    await svc.recalculate('p1')

    // Delay lands on P only, widening the spread: TE 31 -> 32, SD 2 -> 3.
    expect(tasks[0].pessimisticDuration).toBe(45) // 39 + 6
    expect(tasks[0].expectedDuration).toBe(32)
    expect(tasks[0].standardDeviation).toBe(3)
  })

  it('leaves a zero-duration milestone at zero across every PERT field', async () => {
    const tasks = [T('M1', 0, { isMilestone: true })]
    const { svc } = build(tasks)
    await svc.recalculate('p1')

    expect(tasks[0].expectedDuration).toBe(0)
    expect(tasks[0].variance).toBe(0)
  })
})

describe('WbsService.recalculate — forward pass', () => {
  it('anchors a task with no predecessors to its planned start', async () => {
    // 2026-05-07 is 181 days after PROJECT_START.
    const tasks = [T('A', 30, { plannedStart: '2026-05-07' })]
    const { svc } = build(tasks)
    await svc.recalculate('p1')

    expect(tasks[0].earliestStart).toBe(181)
    expect(tasks[0].earliestFinish).toBe(212) // 181 + 31
  })

  it('walks a finish-to-start chain, accumulating expected durations', async () => {
    const tasks = [T('A', 30), T('B', 30, { predecessors: 'A' }), T('C', 30, { predecessors: 'B' })]
    const { svc } = build(tasks)
    const { projectDuration } = await svc.recalculate('p1')

    const m = byCode(tasks)
    expect([m.get('A').earliestStart, m.get('A').earliestFinish]).toEqual([0, 31])
    expect([m.get('B').earliestStart, m.get('B').earliestFinish]).toEqual([31, 62])
    expect([m.get('C').earliestStart, m.get('C').earliestFinish]).toEqual([62, 93])
    expect(projectDuration).toBe(93)
  })

  it('applies lag on a finish-to-start link', async () => {
    const tasks = [T('A', 30), T('B', 30, { dependencies: [{ code: 'A', type: 'FS', lag: 10 }] })]
    const { svc } = build(tasks)
    await svc.recalculate('p1')

    expect(byCode(tasks).get('B').earliestStart).toBe(41) // EF(A)=31, +10 lag
  })

  it('overlaps a start-to-start link by its lag rather than serialising it', async () => {
    // The linear-infrastructure case: backfill crew trails the laying crew by
    // 20 days instead of waiting for the whole 62-day package to finish.
    const tasks = [T('A', 60), T('B', 30, { dependencies: [{ code: 'A', type: 'SS', lag: 20 }] })]
    const { svc } = build(tasks)
    await svc.recalculate('p1')

    const b = byCode(tasks).get('B')
    expect(b.earliestStart).toBe(20) // ES(A)=0, +20 lag — not EF(A)=62
    expect(b.earliestFinish).toBe(51)
  })

  it('back-computes a start from a finish-to-finish link', async () => {
    const tasks = [T('A', 60), T('B', 30, { dependencies: [{ code: 'A', type: 'FF', lag: 10 }] })]
    const { svc } = build(tasks)
    await svc.recalculate('p1')

    // ES = EF(A) + lag - duration = 62 + 10 - 31
    expect(byCode(tasks).get('B').earliestStart).toBe(41)
  })

  it('takes the latest of several predecessors', async () => {
    const tasks = [
      T('A', 30), // EF 31
      T('B', 90), // EF 93
      T('C', 30, { predecessors: 'A,B' }),
    ]
    const { svc } = build(tasks)
    await svc.recalculate('p1')

    expect(byCode(tasks).get('C').earliestStart).toBe(93) // driven by B, not A
  })

  it('terminates on a dependency cycle instead of recursing forever', async () => {
    const tasks = [T('A', 30, { predecessors: 'B' }), T('B', 30, { predecessors: 'A' })]
    const { svc } = build(tasks)

    const result = await svc.recalculate('p1')
    expect(Number.isFinite(result.projectDuration)).toBe(true)
  })
})

describe('WbsService.recalculate — backward pass, float and critical path', () => {
  //        B (60) ─┐
  //  A (30) ┤       ├─ D (30)
  //        C (30) ─┘
  // A->B->D is the long route; C carries slack.
  const diamond = () => [
    T('A', 30),
    T('B', 60, { predecessors: 'A' }),
    T('C', 30, { predecessors: 'A' }),
    T('D', 30, { predecessors: 'B,C' }),
  ]

  it('drives project duration off the longest path', async () => {
    const tasks = diamond()
    const { svc } = build(tasks)
    const { projectDuration } = await svc.recalculate('p1')

    expect(projectDuration).toBe(124) // 31 (A) + 62 (B) + 31 (D)
  })

  it('gives the off-path task positive float and the long path zero', async () => {
    const tasks = diamond()
    const { svc } = build(tasks)
    await svc.recalculate('p1')

    const m = byCode(tasks)
    expect(m.get('A').totalFloat).toBe(0)
    expect(m.get('B').totalFloat).toBe(0)
    expect(m.get('D').totalFloat).toBe(0)
    expect(m.get('C').totalFloat).toBe(31) // C may slip 31 days without moving D
  })

  it('reports exactly the zero-float tasks as critical', async () => {
    const tasks = diamond()
    const { svc } = build(tasks)
    const { critical } = await svc.recalculate('p1')

    expect(critical.sort()).toEqual(['A', 'B', 'D'])
    expect(critical).not.toContain('C')
  })

  it('excludes milestones from the critical path even at zero float', async () => {
    // A zero-duration milestone always has zero float; it is a reporting marker,
    // not a work package, so it must not appear as critical work.
    const tasks = [T('A', 30), T('M1', 0, { predecessors: 'A', isMilestone: true })]
    const { svc } = build(tasks)
    const { critical } = await svc.recalculate('p1')

    expect(byCode(tasks).get('M1').totalFloat).toBe(0)
    expect(critical).toEqual(['A'])
  })

  it('persists the computed schedule', async () => {
    const tasks = diamond()
    const { svc, repo } = build(tasks)
    await svc.recalculate('p1')

    expect(repo.save).toHaveBeenCalledWith(tasks)
  })
})

describe('WbsService.recalculate — Liaison approval floor', () => {
  const LF = (linkedWbsCode: string, dates: { actualDate?: string; expectedDate?: string }) =>
    ({ linkedWbsCode, actualDate: null, expectedDate: null, ...dates }) as any

  it('holds a gated task until the approval actually landed', async () => {
    // Network alone would start B on day 31; the UEED approval it depends on
    // only came through on 2026-03-07 (day 120), so B cannot precede that.
    const tasks = [T('A', 30), T('B', 30, { predecessors: 'A' })]
    const { svc } = build(tasks, [LF('B', { actualDate: '2026-03-07' })])
    await svc.recalculate('p1')

    const b = byCode(tasks).get('B')
    expect(b.earliestStart).toBe(120)
    expect(b.earliestFinish).toBe(151)
  })

  it('uses a still-future expected approval date as the floor', async () => {
    const future = new Date(Date.now() + 400 * 86400000).toISOString().split('T')[0]
    const expectedFloor = Math.round(
      (new Date(future).getTime() - new Date(PROJECT_START).getTime()) / 86400000,
    )
    const tasks = [T('A', 30), T('B', 30, { predecessors: 'A' })]
    const { svc } = build(tasks, [LF('B', { expectedDate: future })])
    await svc.recalculate('p1')

    expect(byCode(tasks).get('B').earliestStart).toBe(expectedFloor)
  })

  it('slips an overdue pending approval to today rather than its stale expected date', async () => {
    // The approval was due in the past and still has no actual date, so the
    // earliest it can now clear is today — the schedule must not keep planning
    // against a date that has already gone by.
    const today = new Date().toISOString().split('T')[0]
    const todayFloor = Math.round(
      (new Date(today).getTime() - new Date(PROJECT_START).getTime()) / 86400000,
    )
    const tasks = [T('A', 30), T('B', 30, { predecessors: 'A' })]
    const { svc } = build(tasks, [LF('B', { expectedDate: '2026-01-01' })])
    await svc.recalculate('p1')

    expect(byCode(tasks).get('B').earliestStart).toBe(todayFloor)
  })

  it('takes the latest floor when several approvals gate one task', async () => {
    const tasks = [T('A', 30), T('B', 30, { predecessors: 'A' })]
    const { svc } = build(tasks, [
      LF('B', { actualDate: '2026-03-07' }), // day 120
      LF('B', { actualDate: '2026-05-07' }), // day 181 — governs
    ])
    await svc.recalculate('p1')

    expect(byCode(tasks).get('B').earliestStart).toBe(181)
  })

  it('ignores approval files that are not linked to a WBS code', async () => {
    const tasks = [T('A', 30), T('B', 30, { predecessors: 'A' })]
    const { svc } = build(tasks, [LF(null as any, { actualDate: '2026-05-07' })])
    await svc.recalculate('p1')

    expect(byCode(tasks).get('B').earliestStart).toBe(31) // network value, unfloored
  })

  it('propagates an approval delay into the project duration', async () => {
    const tasks = [T('A', 30), T('B', 30, { predecessors: 'A' }), T('C', 30, { predecessors: 'B' })]
    const { svc } = build(tasks, [LF('B', { actualDate: '2026-03-07' })])
    const { projectDuration } = await svc.recalculate('p1')

    // Baseline is 93; the 120-day approval floor pushes the tail out to 182.
    expect(projectDuration).toBe(182)
  })
})

describe('WbsService.computeWeightedProgress — Tender Contract Weightages', () => {
  const svc = new WbsService({} as any, {} as any)

  it('computes 5.9% progress when Survey is 100% and STP is 5%', () => {
    const tasks = [
      { wbsCode: '1', progressPct: 100, paymentPct: 5, parentId: null, isMilestone: false },
      { wbsCode: '2', progressPct: 0, paymentPct: 35, parentId: null, isMilestone: false },
      { wbsCode: '3', progressPct: 0, paymentPct: 16, parentId: null, isMilestone: false },
      { wbsCode: '4', progressPct: 5, paymentPct: 18, parentId: null, isMilestone: false },
      { wbsCode: '5', progressPct: 0, paymentPct: 5, parentId: null, isMilestone: false },
      { wbsCode: '6', progressPct: 0, paymentPct: 14, parentId: null, isMilestone: false },
      { wbsCode: '7', progressPct: 0, paymentPct: 2, parentId: null, isMilestone: false },
      { wbsCode: '8', progressPct: 0, paymentPct: 2.5, parentId: null, isMilestone: false },
      { wbsCode: '9', progressPct: 0, paymentPct: 2.5, parentId: null, isMilestone: true },
      // Statutory non-capital hold tasks (must not dilute tender weight)
      { wbsCode: '0.1', progressPct: 0, paymentPct: 0, parentId: null, isMilestone: false },
      { wbsCode: '0.2', progressPct: 0, paymentPct: 0, parentId: null, isMilestone: false },
    ] as any

    const progress = svc.computeWeightedProgress(tasks)
    // Survey (100% * 5%) + STP (5% * 18% = 0.9%) = 5.9%
    expect(progress).toBe(5.9)
  })

  it('evaluates Survey alone as exactly 5.0% of the contract', () => {
    const tasks = [
      { wbsCode: '1', progressPct: 100, paymentPct: 5, parentId: null, isMilestone: false },
      { wbsCode: '2', progressPct: 0, paymentPct: 35, parentId: null, isMilestone: false },
      { wbsCode: '3', progressPct: 0, paymentPct: 16, parentId: null, isMilestone: false },
      { wbsCode: '4', progressPct: 0, paymentPct: 18, parentId: null, isMilestone: false },
    ] as any

    const progress = svc.computeWeightedProgress(tasks)
    expect(progress).toBe(5.0)
  })

  it('rolls up subtasks into parent package progress', () => {
    const tasks = [
      { wbsCode: '1', progressPct: 0, paymentPct: 5, parentId: null, isMilestone: false },
      { wbsCode: '2', progressPct: 0, paymentPct: 35, parentId: null, isMilestone: false }, // Parent 2
      { wbsCode: '2.1', progressPct: 20, paymentPct: 0, parentId: '2', isMilestone: false }, // Subtask
      { wbsCode: '2.2', progressPct: 20, paymentPct: 0, parentId: '2', isMilestone: false }, // Subtask
    ] as any

    // Subtasks average = 20% on Parent 2 (weight 35%) -> 20% * 35% / 100% contract = 7.0%
    const progress = svc.computeWeightedProgress(tasks)
    expect(progress).toBe(7.0)
  })
})
