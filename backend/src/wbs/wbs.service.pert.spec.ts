import { WbsService } from './wbs.service'

/**
 * Verifies the execution-window PERT rollup:
 *  - post-completion O&M (plannedStart >= contract end 2028-05-07) is EXCLUDED
 *    from the expected duration and variance (so P(T<=912d) is meaningful),
 *  - the expected duration is the terminal max earliestFinish (no sum double-count),
 *  - variance sums LEAF critical tasks only (parents excluded).
 */
describe('WbsService.executionPert (O&M scoping + leaf variance)', () => {
  const svc = new WbsService({} as any, {} as any)
  const call = (tasks: any[]) => (svc as any).executionPert(tasks)

  const tasks = [
    { wbsCode: 'A',   plannedStart: '2026-01-01', earliestFinish: 900,  isCritical: true, variance: 100,   parentId: null },
    { wbsCode: 'B',   plannedStart: '2027-11-07', earliestFinish: 1443, isCritical: true, variance: 200,   parentId: null },
    { wbsCode: 'P',   plannedStart: '2026-02-01', earliestFinish: 1000, isCritical: true, variance: 500,   parentId: null }, // parent
    { wbsCode: 'P.1', plannedStart: '2026-02-01', earliestFinish: 1000, isCritical: true, variance: 120,   parentId: 'P' },  // child
    { wbsCode: '10',  plannedStart: '2028-05-08', earliestFinish: 3300, isCritical: true, variance: 15000, parentId: null }, // O&M
  ]

  it('excludes O&M from the expected duration (uses execution terminal finish)', () => {
    const { projectExpected } = call(tasks)
    expect(projectExpected).toBe(1443)   // NOT 3300 — O&M dropped
  })

  it('sums variance over leaf critical tasks only, excluding parents and O&M', () => {
    const { projectVariance } = call(tasks)
    expect(projectVariance).toBe(420)     // 100 + 200 + 120 (parent P's 500 and O&M's 15000 excluded)
  })

  it('treats a task with no plannedStart as an execution task', () => {
    const { projectExpected } = call([{ wbsCode: 'X', earliestFinish: 500, isCritical: false, variance: 0, parentId: null }])
    expect(projectExpected).toBe(500)
  })
})

describe('WbsService.deriveDependenciesFromPlan (SS+lag from planned overlap)', () => {
  const svc = new WbsService({} as any, {} as any)
  const T = (wbsCode: string, plannedStart: string, plannedEnd: string, predecessors: string) =>
    ({ wbsCode, plannedStart, plannedEnd, predecessors, dependencies: [] }) as any
  const rows = [
    T('1', '2025-11-07', '2026-01-31', ''),
    T('2', '2026-02-01', '2027-03-31', '1'),
    T('3', '2026-02-01', '2027-03-31', '1'),
    T('4', '2026-02-01', '2027-06-30', '1'),
    T('6', '2026-10-01', '2027-10-31', '3,4'),
    T('7', '2026-07-01', '2028-05-07', '2'),
    T('2.1', '2026-02-01', '2027-01-31', '1'),
    T('2.2', '2026-03-01', '2027-02-28', '2.1'),
  ]
  const byCode = new Map(rows.map(r => [r.wbsCode, r]))
  const derive = (code: string) => (svc as any).deriveDependenciesFromPlan(byCode.get(code), byCode)

  it('keeps sequential links finish-to-start (task 2 starts after task 1 finishes)', () => {
    expect(derive('2')).toEqual([{ code: '1', type: 'FS', lag: 0 }])
  })

  it('converts overlapping E&M (6) vs civil (3,4) to SS with planned-offset lag', () => {
    expect(derive('6')).toEqual([
      { code: '3', type: 'SS', lag: 242 },
      { code: '4', type: 'SS', lag: 242 },
    ])
  })

  it('converts road reinstatement (7) trailing sewer (2) to SS+150', () => {
    expect(derive('7')).toEqual([{ code: '2', type: 'SS', lag: 150 }])
  })

  it('converts concurrent pipe sub-packages (2.2 behind 2.1) to SS+28', () => {
    expect(derive('2.2')).toEqual([{ code: '2.1', type: 'SS', lag: 28 }])
  })
})
