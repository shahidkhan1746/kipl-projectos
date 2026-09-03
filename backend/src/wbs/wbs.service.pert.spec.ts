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
