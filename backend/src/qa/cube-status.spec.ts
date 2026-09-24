import { cubeStage, cubeAtRisk } from './cube-status'

const TODAY = '2026-09-24'

describe('cubeStage', () => {
  it('is CAST while the 7-day break is still in the future', () => {
    expect(cubeStage({
      overallStatus: 'CAST', status7d: 'PENDING', status28d: 'PENDING',
      test7dDate: '2026-09-30', test28dDate: '2026-10-21',
    }, TODAY)).toBe('CAST')
  })

  it('becomes 7D_DUE on the due date itself, not the day after', () => {
    expect(cubeStage({
      overallStatus: 'CAST', status7d: 'PENDING',
      test7dDate: TODAY, test28dDate: '2026-10-15',
    }, TODAY)).toBe('7D_DUE')
  })

  it('stays 7D_DUE when the break is overdue', () => {
    expect(cubeStage({
      overallStatus: 'CAST', status7d: 'PENDING',
      test7dDate: '2026-09-01', test28dDate: '2026-09-22',
    }, TODAY)).toBe('7D_DUE')
  })

  it('is 7D_TESTED once loads are in and the 28-day break is not due', () => {
    expect(cubeStage({
      overallStatus: '7D_TESTED', status7d: 'ON_TRACK', status28d: 'PENDING',
      test7dDate: '2026-09-17', test28dDate: '2026-10-08',
    }, TODAY)).toBe('7D_TESTED')
  })

  it('is 28D_DUE once the 28-day break comes due', () => {
    expect(cubeStage({
      overallStatus: '7D_TESTED', status7d: 'ON_TRACK', status28d: 'PENDING',
      test7dDate: '2026-08-27', test28dDate: '2026-09-17',
    }, TODAY)).toBe('28D_DUE')
  })

  it('reports PASSED and FAILED from the completed 28-day break', () => {
    expect(cubeStage({ overallStatus: 'COMPLETED_PASSED', status28d: 'PASSED' }, TODAY)).toBe('PASSED')
    expect(cubeStage({ overallStatus: 'COMPLETED_FAILED', status28d: 'FAILED' }, TODAY)).toBe('FAILED')
  })

  it('reports the 28-day result even when the break was recorded late', () => {
    // The 28-day due date is long past, but the cube has been crushed. It is a
    // result, not an outstanding job.
    expect(cubeStage({
      overallStatus: 'COMPLETED_PASSED', status7d: 'ON_TRACK', status28d: 'PASSED',
      test7dDate: '2026-07-01', test28dDate: '2026-07-22',
    }, TODAY)).toBe('PASSED')
  })

  it('does not call an at-risk cube failed before its 28-day break', () => {
    // status7d FAILED is a projection off the 7-day loads. The cube has not
    // been crushed at 28 days and may yet pass; calling it FAILED here would
    // put an unverified failure in the register.
    expect(cubeStage({
      overallStatus: '7D_TESTED', status7d: 'FAILED', status28d: 'PENDING',
      test7dDate: '2026-09-01', test28dDate: '2026-09-22',
    }, TODAY)).toBe('28D_DUE')
  })

  it('moves off CAST on status7d alone when overallStatus has not caught up', () => {
    // The two columns are written by the same save, but a partial or older row
    // must not read as "never broken" just because overallStatus still says CAST.
    expect(cubeStage({
      overallStatus: 'CAST', status7d: 'ON_TRACK', status28d: 'PENDING',
      test7dDate: '2026-09-17', test28dDate: '2026-10-08',
    }, TODAY)).toBe('7D_TESTED')
  })

  it('treats a missing due date as not yet due rather than overdue', () => {
    // An older row written before the dates were computed must not show up in
    // the "due today" count and send someone to the lab for nothing.
    expect(cubeStage({ overallStatus: 'CAST', status7d: 'PENDING' }, TODAY)).toBe('CAST')
    expect(cubeStage({
      overallStatus: 'CAST', status7d: 'PENDING', test7dDate: null, test28dDate: null,
    }, TODAY)).toBe('CAST')
    expect(cubeStage({
      overallStatus: '7D_TESTED', status7d: 'ON_TRACK', test28dDate: '',
    }, TODAY)).toBe('7D_TESTED')
  })
})

describe('cubeAtRisk', () => {
  it('flags a 7-day projection below fck', () => {
    expect(cubeAtRisk({ status7d: 'AT_RISK' })).toBe(true)
    expect(cubeAtRisk({ status7d: 'FAILED' })).toBe(true)
  })

  it('does not flag a cube on track or not yet broken', () => {
    expect(cubeAtRisk({ status7d: 'ON_TRACK' })).toBe(false)
    expect(cubeAtRisk({ status7d: 'PENDING' })).toBe(false)
    expect(cubeAtRisk({})).toBe(false)
  })

  it('stops flagging once the 28-day break settles it, whichever way', () => {
    // status7d is never rewritten by the 28-day break. Read on its own it keeps
    // a cube that projected low and then passed in the at-risk count for good.
    expect(cubeAtRisk({
      status7d: 'AT_RISK', status28d: 'PASSED', overallStatus: 'COMPLETED_PASSED',
    })).toBe(false)
    // A cube that did fail is FAILED, which is a result, not a risk.
    expect(cubeAtRisk({
      status7d: 'AT_RISK', status28d: 'FAILED', overallStatus: 'COMPLETED_FAILED',
    })).toBe(false)
  })

  it('still flags while the 28-day break is outstanding', () => {
    expect(cubeAtRisk({ status7d: 'AT_RISK', status28d: 'PENDING' })).toBe(true)
  })

  it('is independent of the stage, so a cube can be at risk and due at once', () => {
    const cube = {
      overallStatus: '7D_TESTED', status7d: 'AT_RISK', status28d: 'PENDING',
      test7dDate: '2026-09-01', test28dDate: '2026-09-22',
    }
    expect(cubeStage(cube, TODAY)).toBe('28D_DUE')
    expect(cubeAtRisk(cube)).toBe(true)
  })
})
