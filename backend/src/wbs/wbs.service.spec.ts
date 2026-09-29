import { WbsService, DEFAULT_CONTRACT_START } from './wbs.service'

/**
 * WbsService around the scheduler: how stored activities become CPM input,
 * where contract dates come from, what is saved and what is only computed,
 * and the audit findings that lived in this layer rather than in the maths.
 *
 * "Today" is pinned so the data date is deterministic.
 */

const TODAY = '2026-01-06' // day 60 from 07 Nov 2025

type Row = Record<string, any>
const T = (wbsCode: string, plannedDuration: number, extra: Row = {}): Row => ({
  id: `id-${wbsCode}`, projectId: 'p1', wbsCode, title: `Activity ${wbsCode}`,
  plannedDuration, plannedStart: '2025-11-07', plannedEnd: '2025-11-07',
  dependencies: [], predecessors: '', isMilestone: false, parentId: null,
  progressPct: 0, status: 'not_started', calendar: 'seven_day', scheduleScope: 'contract',
  delayDays: 0, eotApplied: false, eotDays: 0, sortOrder: 0, ...extra,
})
const dep = (code: string, type = 'FS', lag = 0) => ({ code, type, lag })

function memRepo(rows: Row[]) {
  let n = 0
  const repo = {
    rows,
    saves: 0,
    find: jest.fn(async ({ where }: any = {}) => rows.filter(r => !where || Object.entries(where).every(([k, v]) => r[k] === v))),
    findOne: jest.fn(async ({ where }: any) => rows.find(r => Object.entries(where).every(([k, v]) => r[k] === v)) ?? null),
    count: jest.fn(async ({ where }: any = {}) => rows.filter(r => !where || Object.entries(where).every(([k, v]) => r[k] === v)).length),
    create: (o: any) => ({ ...o }),
    delete: jest.fn(async () => { rows.length = 0 }),
    // By id, or by criteria as TypeORM allows.
    update: jest.fn(async (where: any, patch: any) => {
      for (const r of rows.filter(r => typeof where === 'string' ? r.id === where : Object.entries(where).every(([k, v]) => r[k] === v))) Object.assign(r, patch)
    }),
    save: jest.fn(async (x: any) => {
      repo.saves++
      for (const o of Array.isArray(x) ? x : [x]) {
        if (!o.id) o.id = `new-${++n}`
        const i = rows.findIndex(r => r.id === o.id)
        if (i >= 0) rows[i] = o; else rows.push(o)
      }
      return x
    }),
  }
  return repo
}

function build(rows: Row[], opts: { liaison?: Row[]; diaries?: Row[]; project?: Row | null } = {}) {
  const repo = memRepo(rows)
  const liaisonRepo = { find: jest.fn(async () => opts.liaison ?? []) }
  const diaryRepo = { find: jest.fn(async () => opts.diaries ?? []) }
  const projectRepo = { findOne: jest.fn(async () => opts.project ?? null) }
  const baselines = memRepo([])
  const svc = new WbsService(repo as any, liaisonRepo as any, diaryRepo as any, undefined, projectRepo as any, baselines as any)
  return { svc, repo, baselines }
}

beforeAll(() => { jest.useFakeTimers().setSystemTime(new Date(`${TODAY}T06:00:00Z`)) })
afterAll(() => { jest.useRealTimers() })

describe('WbsService — contract dates', () => {
  it('takes day 0 and completion from the project record when set', async () => {
    const { svc } = build([T('A', 10)], { project: { startDate: '2025-09-27', endDate: '2028-03-27' } })
    const cpm = await svc.getCPM('p1')
    expect(cpm.projectStart).toBe('2025-09-27')
    expect(cpm.contractCompletion).toBe('2028-03-27')
    expect(cpm.contractDatesSource).toBe('project')
    expect(cpm.issues.some((i: any) => i.rule === 'contract-dates-unset')).toBe(false)
  })

  it('falls back to the built-in dates and says so when the project has none', async () => {
    const { svc } = build([T('A', 10)])
    const cpm = await svc.getCPM('p1')
    expect(cpm.projectStart).toBe(DEFAULT_CONTRACT_START)
    const warning = cpm.issues.find((i: any) => i.rule === 'contract-dates-unset')!
    expect(warning.message).toContain('27 Mar 2028')
  })
})

describe('WbsService — turning stored rows into CPM input', () => {
  it('schedules a row created with dates but no duration on the span of its dates', async () => {
    // The old Add form sent dates only, and the engine scheduled 0 days.
    const { svc } = build([T('A', 0, { plannedStart: '2026-04-01', plannedEnd: '2026-06-29' })])
    const cpm = await svc.getCPM('p1')
    expect(cpm.allTasks[0].duration).toBe(90)
  })

  it('schedules on the planned duration, not the PERT expected duration', async () => {
    const { svc } = build([T('A', 86)])
    const cpm = await svc.getCPM('p1')
    expect(cpm.allTasks[0].ef! - cpm.allTasks[0].es!).toBe(86)
  })

  it('accepts a parent link written as the parent code or the parent id', async () => {
    const { svc } = build([T('2', 423), T('2.1', 30, { parentId: '2' }), T('2.2', 40, { parentId: 'id-2' })])
    const cpm = await svc.getCPM('p1')
    const summary = cpm.allTasks.find((t: any) => t.wbsCode === '2')!
    expect(summary.isSummary).toBe(true)
    expect(summary.ef! - summary.es!).toBe(40) // rolled up from its activities, not its own 423
  })

  it('finishes a completed row on its actual date and releases its successor then', async () => {
    const { svc } = build([
      T('A', 30, { actualStart: '2025-11-07', actualEnd: '2025-12-26', status: 'completed', progressPct: 100 }),
      T('B', 10, { dependencies: [dep('A')] }),
    ])
    const cpm = await svc.getCPM('p1')
    const a = cpm.allTasks.find((t: any) => t.wbsCode === 'A')!
    expect(a.forecastFinish).toBe('2025-12-26')
    expect(a.status).toBe('complete')
    // B could follow A on 27 Dec, but that is before the data date (6 Jan).
    expect(cpm.allTasks.find((t: any) => t.wbsCode === 'B')!.forecastStart).toBe(TODAY)
  })

  it('treats a row marked complete with no actual dates as finished on its plan', async () => {
    const { svc } = build([T('A', 20, { plannedStart: '2025-11-07', plannedEnd: '2025-11-26', status: 'completed', progressPct: 100 })])
    const cpm = await svc.getCPM('p1')
    expect(cpm.allTasks[0].forecastFinish).toBe('2025-11-26')
    expect(cpm.issues.some((i: any) => i.rule === 'complete-without-actuals')).toBe(true)
  })
})

describe('WbsService — approval floors', () => {
  const tasks = () => [T('A', 30), T('B', 30, { dependencies: [dep('A')] })]
  const LF = (extra: Row) => ({ linkedWbsCode: 'B', fileNumber: 'LIA/1', actualDate: null, expectedDate: null, currentStatus: 'submitted', ...extra })

  it('holds a task until the approval actually landed', async () => {
    const { svc } = build(tasks(), { liaison: [LF({ actualDate: '2026-03-07', currentStatus: 'approved' })] })
    expect((await svc.getCPM('p1')).allTasks.find((t: any) => t.wbsCode === 'B')!.forecastStart).toBe('2026-03-07')
  })

  it('holds a pending approval with a future expected date until that date', async () => {
    const { svc } = build(tasks(), { liaison: [LF({ expectedDate: '2026-05-01' })] })
    expect((await svc.getCPM('p1')).allTasks.find((t: any) => t.wbsCode === 'B')!.forecastStart).toBe('2026-05-01')
  })

  it('never lets work gated by an undated pending approval start in the past, and warns', async () => {
    // It used to impose nothing, so the gated task could be scheduled on day 0.
    const { svc } = build([T('B', 1)], { liaison: [LF({})] })
    const cpm = await svc.getCPM('p1')
    expect(cpm.allTasks[0].forecastStart! >= TODAY).toBe(true)
    expect(cpm.issues.some((i: any) => i.rule === 'approval-undated' && i.activity === 'B')).toBe(true)
  })

  it('imposes nothing for an approval that is settled with no date', async () => {
    const { svc } = build(tasks(), { liaison: [LF({ currentStatus: 'approved' })] })
    const b = (await svc.getCPM('p1')).allTasks.find((t: any) => t.wbsCode === 'B')!
    expect(b.drivenBy).not.toBe('approval')
  })
})

describe('WbsService — reads never write', () => {
  it('computes the CPM, PERT, dashboard, list and EOT register without saving', async () => {
    const { svc, repo } = build([T('A', 10), T('B', 5, { dependencies: [dep('A')] })])
    await svc.getCPM('p1'); await svc.getPERT('p1'); await svc.dashboard('p1')
    await svc.listScheduled('p1'); await svc.getEotRegister('p1')
    expect(repo.save).not.toHaveBeenCalled()
  })

  it('saves only on recalculation', async () => {
    const { svc, repo } = build([T('A', 10)])
    await svc.recalculate('p1')
    expect(repo.save).toHaveBeenCalledTimes(1)
    expect(repo.rows[0].earliestFinish).toBe(70) // held to the data date, day 60
  })

  it('does not overwrite the stored schedule when the network is invalid', async () => {
    const { svc, repo } = build([T('A', 10, { earliestStart: 5, dependencies: [dep('B')] }), T('B', 10, { dependencies: [dep('A')] })])
    const r = await svc.recalculate('p1')
    expect(r.ok).toBe(false)
    expect(r.issues.some((i: any) => i.rule === 'logic-loop')).toBe(true)
    expect(repo.rows[0].earliestStart).toBe(5)
  })
})

describe('WbsService — dashboard and PERT', () => {
  it('counts a milestone as hit only when it is achieved, not when its date has passed', async () => {
    const { svc } = build([
      T('M1', 0, { isMilestone: true, plannedStart: '2025-12-01', plannedEnd: '2025-12-01' }),
      T('M2', 0, { isMilestone: true, plannedStart: '2025-12-15', plannedEnd: '2025-12-15', status: 'completed', actualEnd: '2025-12-15' }),
    ])
    const d = await svc.dashboard('p1')
    expect(d.milestonesHit).toBe(1)
    expect(d.milestonesOverdue).toBe(1)
  })

  it('does not report a coin-flip when there is no spread to measure', async () => {
    // A forecast well past the contract with zero variance used to read "50%".
    const { svc } = build([T('A', 2000, { title: 'Survey', plannedStart: '2026-04-01', plannedEnd: '2026-04-01' })])
    jest.spyOn((svc as any).riskEngine, 'assessTaskRisk').mockReturnValue({ alphaDyn: 1, betaDyn: 1, isWinterScheduled: false } as any)
    const pert = await svc.getPERT('p1')
    expect(pert.contractOnTimeProbPct).toBe(0)
    expect(pert.probabilityNote).toContain('not a probability')
  })

  it('reports a Clause 16.3 forecast for every stage from the forecast dates', async () => {
    const { svc } = build([T('1', 900, { paymentPct: 100 })])
    const pert = await svc.getPERT('p1')
    const half = pert.clause16Milestones.find((s: any) => s.stage.startsWith('Stage 2'))!
    expect(half.forecastProgressPct).toBeGreaterThan(0)
    expect(typeof half.forecastMeets).toBe('boolean')
  })
})

describe('WbsService — EOT register', () => {
  const diary = (id: string, date: string, hoursLost: number) => ({ id, date, hoursLost, eotClaim: true, eotReason: 'Snow' })

  it('counts a weather stoppage once, even where the old sync copied it onto an activity', async () => {
    const d = diary('11111111-aaaa-bbbb-cccc-000000000001', '2025-12-20', 16)
    const { svc } = build(
      [T('10', 100, { eotApplied: true, eotDays: 2, delayReason: `diary-eot:${d.id} Snow`, scheduleScope: 'post_completion' })],
      { diaries: [d] },
    )
    const reg = await svc.getEotRegister('p1')
    expect(reg.totals.weatherDelayDays).toBe(2)
    expect(reg.totals.taskDelayDays).toBe(0)
    expect(reg.totals.claimableEotDays).toBe(2)
  })

  it('claims nothing for a diary with no hours lost, and says the hours are missing', async () => {
    const { svc } = build([T('A', 10)], { diaries: [diary('d0', '2025-12-20', 0)] })
    const reg = await svc.getEotRegister('p1')
    expect(reg.weatherDelays[0].delayDays).toBe(0)
    expect(reg.weatherDelays[0].hoursNotRecorded).toBe(true)
  })

  it('does not declare weather critical', async () => {
    const { svc } = build([T('A', 10)], { diaries: [diary('d1', '2025-12-20', 8)] })
    expect((await svc.getEotRegister('p1')).weatherDelays[0].criticalPathImpact).toBeNull()
  })

  it('counts overlapping delays once', async () => {
    // Two approvals late across the same 30 days: 60 days of delay, 30 of time.
    const approval = (ref: string) => ({
      fileNumber: ref, subject: ref, linkedWbsCode: 'A', isEotGround: true, delayDays: 30,
      expectedDate: '2025-12-01', actualDate: '2025-12-31', currentStatus: 'approved',
    })
    const { svc } = build([T('A', 10)], { liaison: [approval('L1'), approval('L2')] })
    const reg = await svc.getEotRegister('p1')
    expect(reg.totals.grossEotDays).toBe(60)
    expect(reg.totals.netDatedEotDays).toBe(30)
    expect(reg.totals.overlapDays).toBe(30)
    expect(reg.totals.claimableEotDays).toBe(30)
  })

  it('measures an approval delay up to the day before it arrived, as Liaison counts it', async () => {
    // 28 days late (15 Feb → 15 Mar), plus snow on 12–13 Jan and again on 13 Jan:
    // the two diary windows share one day, and nothing else overlaps.
    const approval = {
      fileNumber: 'L1', subject: 'Design vetting', linkedWbsCode: 'A', isEotGround: true, delayDays: 28,
      expectedDate: '2026-02-15', actualDate: '2026-03-15', currentStatus: 'approved',
    }
    const { svc } = build([T('A', 10)], {
      liaison: [approval],
      diaries: [diary('d1', '2026-01-12', 16), diary('d2', '2026-01-13', 8)],
    })
    const reg = await svc.getEotRegister('p1')
    expect(reg.approvalDelays[0].window).toEqual({ from: '2026-02-15', to: '2026-03-14' })
    expect(reg.totals.grossEotDays).toBe(31)
    expect(reg.totals.overlapDays).toBe(1)
    expect(reg.totals.claimableEotDays).toBe(30)
    expect(reg.totals.grossEotDays - reg.totals.overlapDays).toBe(reg.totals.claimableEotDays)
  })

  it('credits an approval delay on the longest path', async () => {
    const approval = {
      fileNumber: 'L1', subject: 'Design approval', linkedWbsCode: 'B', isEotGround: true, delayDays: 20,
      expectedDate: '2026-01-10', actualDate: '2026-01-29', currentStatus: 'approved',
    }
    const { svc } = build([T('A', 10), T('B', 10, { dependencies: [dep('A')] })], { liaison: [approval] })
    expect((await svc.getEotRegister('p1')).approvalDelays[0].criticalPathImpact).toBe(true)
  })
})

describe('WbsService — writing activities', () => {
  it('derives a duration from dates on create when none is given', async () => {
    const { svc, repo } = build([])
    await svc.create({ projectId: 'p1', wbsCode: '3.6', title: 'IPS-2 Wet Well', plannedStart: '2026-04-01', plannedEnd: '2026-06-29' })
    expect(repo.rows[0].plannedDuration).toBe(90)
  })

  it('refuses a duplicate activity code', async () => {
    const { svc } = build([T('A', 10)])
    await expect(svc.create({ projectId: 'p1', wbsCode: 'A', title: 'again' })).rejects.toThrow(/already used/)
  })

  it('does not accept typed-in delay days — delay is derived from the forecast', async () => {
    const { svc, repo } = build([T('A', 10, { plannedStart: '2025-11-07', plannedEnd: '2025-11-16' })])
    await svc.update('id-A', { delayDays: 999, remarks: 'x' } as any)
    expect(repo.rows[0].delayDays).not.toBe(999)
  })
})

describe('WbsService — seed', () => {
  it('seeds a programme whose completion precedes the trial run and O&M', async () => {
    const { svc } = build([])
    await svc.seed('p1')
    const cpm = await svc.getCPM('p1')
    expect(cpm.ok).toBe(true)
    const by = new Map(cpm.allTasks.map((t: any) => [t.wbsCode, t]))
    const completion = by.get('M6')!, trial = by.get('9')!, om = by.get('10')!
    expect(trial.scope).toBe('post_completion')
    expect(om.scope).toBe('post_completion')
    expect(trial.forecastStart! > completion.forecastFinish!).toBe(true)
    expect(cpm.longestPath).not.toContain('10')
    expect(cpm.longestPath).not.toContain('9')
    // Completion waits for testing and for road reinstatement.
    expect(completion.forecastFinish! >= by.get('7')!.forecastFinish!).toBe(true)
    expect(completion.forecastFinish! >= by.get('8')!.forecastFinish!).toBe(true)
  })

  it('seeds no logic derived from dates and no loops', async () => {
    const { svc } = build([])
    await svc.seed('p1')
    const { issues } = await svc.scheduleIssues('p1')
    expect(issues.filter(i => i.severity === 'error')).toEqual([])
    expect(issues.some(i => i.rule === 'date-derived-lag')).toBe(false)
  })
})

describe('WbsService — contract-weighted progress', () => {
  const svc = new WbsService({} as any, {} as any)

  it('computes 5.9% when Survey is 100% and STP is 5%', () => {
    const rows = [
      { wbsCode: '1', progressPct: 100, paymentPct: 5 }, { wbsCode: '2', progressPct: 0, paymentPct: 35 },
      { wbsCode: '3', progressPct: 0, paymentPct: 16 }, { wbsCode: '4', progressPct: 5, paymentPct: 18 },
      { wbsCode: '5', progressPct: 0, paymentPct: 5 }, { wbsCode: '6', progressPct: 0, paymentPct: 14 },
      { wbsCode: '7', progressPct: 0, paymentPct: 2 }, { wbsCode: '8', progressPct: 0, paymentPct: 2.5 },
      { wbsCode: '9', progressPct: 0, paymentPct: 2.5 }, { wbsCode: '0.1', progressPct: 0, paymentPct: 0 },
    ].map(r => ({ ...r, parentId: null, isMilestone: false })) as any
    expect(svc.computeWeightedProgress(rows)).toBe(5.9)
  })

  it('takes a package from its activities, never from a higher figure typed on the package', () => {
    // The old rollup used max(parent, children): 80% typed on the package won.
    const rows = [
      { wbsCode: '2', progressPct: 80, paymentPct: 35, parentId: null },
      { wbsCode: '2.1', progressPct: 10, paymentPct: 0, parentId: '2', plannedDuration: 100 },
      { wbsCode: '2.2', progressPct: 10, paymentPct: 0, parentId: '2', plannedDuration: 100 },
    ] as any
    expect(svc.computeWeightedProgress(rows)).toBe(3.5)
  })

  it('weights activities inside a package by their duration', () => {
    const rows = [
      { wbsCode: '2', progressPct: 0, paymentPct: 35, parentId: null },
      { wbsCode: '2.1', progressPct: 100, paymentPct: 0, parentId: '2', plannedDuration: 300 },
      { wbsCode: '2.2', progressPct: 0, paymentPct: 0, parentId: '2', plannedDuration: 100 },
    ] as any
    // 2.1 is three quarters of the package: 0.75 × 35% = 26.25%.
    expect(svc.computeWeightedProgress(rows)).toBe(26.3)
  })
})

describe('WbsService — baselines', () => {
  it('snapshots the forecast and reports variance against it', async () => {
    const { svc, repo } = build([T('A', 10), T('B', 10, { dependencies: [dep('A')] })])
    const b = await svc.createBaseline('p1', 'Clause 17 submission')
    expect(b.activityCount).toBe(2)
    // A slips: it is now 25 days.
    repo.rows.find(r => r.wbsCode === 'A')!.plannedDuration = 25
    const v = await svc.baselineVariance(b.id)
    expect(v.activities.find(a => a.wbsCode === 'B')!.finishVarianceDays).toBe(15)
    expect(v.finishVarianceDays).toBe(15)
  })

  it('refuses to baseline a schedule with errors', async () => {
    const { svc } = build([T('A', 10, { dependencies: [dep('ZZ')] })])
    await expect(svc.createBaseline('p1', 'x')).rejects.toThrow(/error/)
  })
})

describe('WbsService — time-impact analysis', () => {
  // A (30d) drives completion; B (10d) runs in parallel with 20 days of float.
  // Contract completion is day 912, far away, so only slips are measured.
  const network = () => [
    T('A', 30),
    T('B', 10),
    T('Z', 0, { isMilestone: true, dependencies: [dep('A'), dep('B')] }),
  ]
  const approval = (ref: string, code: string, expectedDate: string, actualDate: string | null, days: number) => ({
    fileNumber: ref, subject: `Approval ${ref}`, linkedWbsCode: code, isEotGround: true, delayDays: days,
    expectedDate, actualDate, currentStatus: actualDate ? 'approved' : 'under_review',
  })

  it('moves completion by the whole delay when it hits the longest path', async () => {
    const { svc } = build(network(), { liaison: [approval('L1', 'A', '2025-11-07', '2025-11-17', 10)] })
    const tia = (await svc.getEotRegister('p1')).timeImpact as any
    expect(tia.events[0]).toMatchObject({ assessed: true, completionSlipDays: 10, absorbedByFloatDays: 0 })
    expect(tia.eotDays).toBe(10)
  })

  it('lets float absorb a delay off the longest path', async () => {
    const { svc } = build(network(), { liaison: [approval('L2', 'B', '2025-11-07', '2025-11-22', 15)] })
    const tia = (await svc.getEotRegister('p1')).timeImpact as any
    expect(tia.events[0]).toMatchObject({ completionSlipDays: 0, absorbedByFloatDays: 15 })
    expect(tia.eotDays).toBe(0)
  })

  it('counts parallel delays on different paths once, not twice', async () => {
    // A slips 10 days; B slips 25 (5 beyond its float). Alone: 10 and 5.
    // Together completion moves 10, because the two run side by side.
    const { svc } = build(network(), {
      liaison: [approval('L1', 'A', '2025-11-07', '2025-11-17', 10), approval('L2', 'B', '2025-11-07', '2025-12-02', 25)],
    })
    const tia = (await svc.getEotRegister('p1')).timeImpact as any
    expect(tia.events.map((e: any) => e.completionSlipDays)).toEqual([10, 5])
    expect(tia.sumOfSeparateSlipsDays).toBe(15)
    expect(tia.eotDays).toBe(10)
    expect(tia.concurrencyDays).toBe(5)
  })

  it('does not count a delay the forecast already contains a second time', async () => {
    // The task started late and is recorded that way; the analysis runs on the
    // plan, so the 10-day approval delay is measured once, as 10.
    const rows = network()
    rows[0].actualStart = '2025-11-17'; rows[0].status = 'in_progress'; rows[0].progressPct = 50
    const { svc } = build(rows, { liaison: [approval('L1', 'A', '2025-11-07', '2025-11-17', 10)] })
    expect(((await svc.getEotRegister('p1')).timeImpact as any).eotDays).toBe(10)
  })

  it('measures an EOT granted on an activity by stretching it', async () => {
    const rows = network()
    rows[0].eotApplied = true; rows[0].eotDays = 7; rows[0].delayReason = 'Rock strata'
    const { svc } = build(rows)
    const tia = (await svc.getEotRegister('p1')).timeImpact as any
    expect(tia.events.find((e: any) => e.source === 'task')).toMatchObject({ activity: 'A', completionSlipDays: 7 })
  })

  it('lists a weather stoppage as not assessed rather than guessing where it fell', async () => {
    const { svc } = build(network(), { diaries: [{ id: 'd1', projectId: 'p1', date: '2025-12-20', hoursLost: 16, eotClaim: true, eotReason: 'Snow' }] })
    const tia = (await svc.getEotRegister('p1')).timeImpact as any
    expect(tia.events[0]).toMatchObject({ source: 'weather', assessed: false, completionSlipDays: null })
    expect(tia.notAssessedDays).toBe(2)
    expect(tia.eotDays).toBe(0)
  })
})

describe('WbsService — S-curve and the accepted baseline', () => {
  const weighted = () => [
    T('1', 100, { paymentPct: 60 }),
    T('2', 100, { paymentPct: 40, dependencies: [dep('1')] }),
  ]

  it('draws forecast and latest-permissible curves that end at 100%', async () => {
    const { svc } = build(weighted())
    const s = await svc.getSCurve('p1') as any
    const last = s.points[s.points.length - 1]
    expect(last.forecastPct).toBe(100)
    expect(last.latePct).toBe(100)
    // On the contract date everything must be done on its late dates.
    const atContract = s.points.find((p: any) => p.date >= s.contractCompletion)
    expect(atContract.latePct).toBe(100)
    // With float to spare, the latest permissible line trails the forecast.
    const mid = s.points[3]
    expect(mid.latePct).toBeLessThan(mid.forecastPct)
  })

  it('ends the curves when the valued work ends, not after years of unvalued O&M', async () => {
    const rows = [...weighted(), T('OM', 1826, { scheduleScope: 'post_completion', dependencies: [dep('2')] })]
    const { svc } = build(rows)
    const s = await svc.getSCurve('p1') as any
    const last = s.points[s.points.length - 1]
    expect(last.forecastPct).toBe(100)
    expect(last.date < '2029-01-01').toBe(true)
  })

  it('has no planned line or variance until a baseline is saved, and says so', async () => {
    const { svc } = build(weighted())
    const s = await svc.getSCurve('p1') as any
    expect(s.baseline).toBeNull()
    expect(s.points.every((p: any) => p.baselinePct === null)).toBe(true)
    expect(s.today.spi).toBeNull()
    expect(s.note).toMatch(/baseline/i)
  })

  it('plots actual progress only where it was recorded', async () => {
    const rows = weighted()
    const { svc } = build(rows)
    await svc.createBaseline('p1', 'Rev 0')
    rows[0].progressPct = 50; rows[0].status = 'in_progress'; rows[0].actualStart = '2025-11-07'
    const s = await svc.getSCurve('p1') as any
    expect(s.actual.map((a: any) => a.source)).toEqual(['baseline "Rev 0"', 'today'])
    expect(s.actual[0].pct).toBe(0)
    expect(s.actual[1].pct).toBe(30)
  })

  it('keeps one accepted programme per project and uses it for the planned line', async () => {
    const { svc, baselines } = build(weighted())
    const a = await svc.createBaseline('p1', 'Rev 0') as any
    const b = await svc.createBaseline('p1', 'Rev 1') as any
    await svc.activateBaseline(a.id)
    await svc.activateBaseline(b.id)
    expect(baselines.rows.filter(r => r.isActive).map(r => r.name)).toEqual(['Rev 1'])
    expect((await svc.getActiveBaseline('p1') as any).name).toBe('Rev 1')
    expect((await svc.getSCurve('p1') as any).baseline.name).toBe('Rev 1')
  })
})
