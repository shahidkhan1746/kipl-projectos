import { schedule, SchedActivity } from './scheduler'
import { DayClock } from './calendar'

const DAY0 = '2025-11-07'
const clock = () => new DayClock(DAY0)

const A = (code: string, duration: number, links: [string, 'FS' | 'SS' | 'FF' | 'SF', number][] = [], extra: Partial<SchedActivity> = {}): SchedActivity =>
  ({ code, duration, links: links.map(([c, type, lag]) => ({ code: c, type, lag })), ...extra })

const run = (acts: SchedActivity[], opts: { dataDate?: number; mustFinishBy?: number | null } = {}) =>
  schedule(acts, clock(), { dataDate: opts.dataDate ?? 0, mustFinishBy: opts.mustFinishBy ?? null })

const get = (r: ReturnType<typeof run>, code: string) => {
  const a = r.activities.get(code)
  if (!a) throw new Error(`no ${code}`)
  return a
}

describe('scheduler — the textbook network', () => {
  // A(3) → B(4) → D(5) → F(2)   = 14, the long path
  // A(3) → C(2) → E(3) → F(2)   = 10, four days of float on C and E
  const net = () => [
    A('A', 3), A('B', 4, [['A', 'FS', 0]]), A('C', 2, [['A', 'FS', 0]]),
    A('D', 5, [['B', 'FS', 0]]), A('E', 3, [['C', 'FS', 0]]), A('F', 2, [['D', 'FS', 0], ['E', 'FS', 0]]),
  ]

  it('computes early and late dates and the project finish', () => {
    const r = run(net())
    expect(r.ok).toBe(true)
    expect(r.forecastFinish).toBe(14)
    expect([get(r, 'D').es, get(r, 'D').ef, get(r, 'D').ls, get(r, 'D').lf]).toEqual([7, 12, 7, 12])
    expect([get(r, 'E').es, get(r, 'E').ef, get(r, 'E').ls, get(r, 'E').lf]).toEqual([5, 8, 9, 12])
  })

  it('separates total float from free float', () => {
    const r = run(net())
    // C can slip 4 days before the project finish moves, but not one day
    // before E does. E owns the free float.
    expect(get(r, 'C').totalFloat).toBe(4)
    expect(get(r, 'C').freeFloat).toBe(0)
    expect(get(r, 'E').totalFloat).toBe(4)
    expect(get(r, 'E').freeFloat).toBe(4)
  })

  it('names the longest path and only the longest path', () => {
    const r = run(net())
    expect(r.longestPath).toEqual(['A', 'B', 'D', 'F'])
    expect(get(r, 'C').critical).toBe(false)
  })

  it('gives the same answer whatever order the rows arrive in', () => {
    const a = run(net())
    const b = run([...net()].reverse())
    const c = run([net()[3], net()[0], net()[5], net()[1], net()[4], net()[2]])
    for (const code of ['A', 'B', 'C', 'D', 'E', 'F']) {
      expect(get(b, code)).toEqual(get(a, code))
      expect(get(c, code)).toEqual(get(a, code))
    }
    expect(b.longestPath).toEqual(a.longestPath)
  })
})

describe('scheduler — defects the old engine had', () => {
  it('gives an identical serial chain the same result in either row order', () => {
    // The old engine: ABC gave 30 days / all critical; CBA gave 31 days / only C.
    const abc = [A('A', 10), A('B', 10, [['A', 'FS', 0]]), A('C', 10, [['B', 'FS', 0]])]
    const cba = [...abc].reverse()
    for (const r of [run(abc), run(cba)]) {
      expect(r.forecastFinish).toBe(30)
      expect(r.longestPath).toEqual(['A', 'B', 'C'])
      for (const code of ['A', 'B', 'C']) expect(get(r, code).totalFloat).toBe(0)
    }
  })

  it('keeps an activity critical when it drives the finish through a start-to-start successor', () => {
    // The old engine left A's late finish unbounded: A showed 11 days of float
    // while its own finish was the project finish, and no critical path at all.
    const r = run([A('A', 60), A('B', 30, [['A', 'SS', 20]])])
    expect(r.forecastFinish).toBe(60)
    expect(get(r, 'A').lf).toBe(60)
    expect(get(r, 'A').totalFloat).toBe(0)
    expect(get(r, 'A').critical).toBe(true)
    expect(get(r, 'B').totalFloat).toBe(10)
  })

  it('does not anchor an open start to a planned date', () => {
    const r = run([A('A', 5, [], { plannedStart: 200 })])
    expect(get(r, 'A').es).toBe(0)
  })

  it('lets a milestone be critical', () => {
    const r = run([A('A', 10), A('M', 0, [['A', 'FS', 0]], { isMilestone: true })])
    expect(get(r, 'M').critical).toBe(true)
    expect(get(r, 'M').es).toBe(10)
  })
})

describe('scheduler — relationship types', () => {
  it('schedules finish-to-finish from the predecessor finish', () => {
    const r = run([A('A', 10), A('B', 4, [['A', 'FF', 2]])])
    expect(get(r, 'B').ef).toBe(12)
    expect(get(r, 'B').es).toBe(8)
  })

  it('schedules start-to-finish from the predecessor start', () => {
    const r = run([A('A', 10, [], { constraint: { type: 'SNET', day: 20 } }), A('B', 5, [['A', 'SF', 3]])])
    expect(get(r, 'B').ef).toBe(23)
    expect(get(r, 'B').es).toBe(18)
  })

  it('overlaps a start-to-start link by its lag', () => {
    const r = run([A('A', 30), A('B', 30, [['A', 'SS', 10]])])
    expect(get(r, 'B').es).toBe(10)
    expect(r.forecastFinish).toBe(40)
  })

  it('takes the latest of several predecessors', () => {
    const r = run([A('A', 5), A('B', 9), A('C', 1, [['A', 'FS', 0], ['B', 'FS', 0]])])
    expect(get(r, 'C').es).toBe(9)
    expect(get(r, 'C').drivenBy).toBe('B')
  })
})

describe('scheduler — contract completion', () => {
  const net = () => [A('A', 500), A('B', 450, [['A', 'FS', 0]]), A('C', 100, [['A', 'FS', 0]])]

  it('reports negative float when the forecast misses the contract date', () => {
    const r = run(net(), { mustFinishBy: 912 })
    expect(r.forecastFinish).toBe(950)
    expect(r.contractVariance).toBe(38)
    expect(get(r, 'B').totalFloat).toBe(-38)
    expect(get(r, 'A').totalFloat).toBe(-38)
    expect(r.longestPath).toEqual(['A', 'B'])
  })

  it('still names the longest path when the contract date has slack', () => {
    const r = run(net(), { mustFinishBy: 1000 })
    expect(get(r, 'B').totalFloat).toBe(50)
    expect(r.longestPath).toEqual(['A', 'B'])
    expect(r.contractVariance).toBe(-50)
  })

  it('applies a finish-no-later-than constraint to one activity', () => {
    const r = run([A('A', 30, [], { constraint: { type: 'FNLT', day: 25 } })])
    expect(get(r, 'A').totalFloat).toBe(-5)
  })

  it('holds an activity behind an external floor, such as an approval', () => {
    const r = run([A('A', 10), A('B', 10, [['A', 'FS', 0]], { floors: [40] })])
    expect(get(r, 'B').es).toBe(40)
    expect(get(r, 'B').drivenBy).toBe('approval')
  })
})

describe('scheduler — post-completion scope', () => {
  // Construction → completion → 182-day trial run → O&M.
  const net = () => [
    A('BUILD', 800),
    A('DONE', 0, [['BUILD', 'FS', 0]], { isMilestone: true }),
    A('TRIAL', 182, [['DONE', 'FS', 0]], { scope: 'post_completion' }),
    A('OM', 1825, [['TRIAL', 'FS', 0]], { scope: 'post_completion' }),
  ]

  it('keeps the trial run and O&M out of the contract finish', () => {
    const r = run(net(), { mustFinishBy: 912 })
    expect(r.forecastFinish).toBe(800)
    expect(r.overallFinish).toBe(800 + 182 + 1825)
    expect(r.contractVariance).toBe(-112)
  })

  it('never lets O&M become the critical path', () => {
    const r = run(net(), { mustFinishBy: 912 })
    expect(r.longestPath).toEqual(['BUILD', 'DONE'])
    expect(get(r, 'OM').critical).toBe(false)
  })

  it('does not let the trial run take float away from completion', () => {
    const r = run(net(), { mustFinishBy: 912 })
    expect(get(r, 'DONE').totalFloat).toBe(112)
    expect(get(r, 'BUILD').totalFloat).toBe(112)
  })

  it('warns when completion is made to wait for the trial run', () => {
    const r = run([
      A('BUILD', 800),
      A('TRIAL', 182, [['BUILD', 'FS', 0]], { scope: 'post_completion' }),
      A('DONE', 0, [['TRIAL', 'FS', 0]], { isMilestone: true }),
    ])
    expect(r.issues.some(i => i.rule === 'contract-after-post-completion' && i.activity === 'DONE')).toBe(true)
  })
})

describe('scheduler — invalid networks are refused, not repaired', () => {
  it('refuses a logic loop and names it', () => {
    const r = run([A('A', 5, [['C', 'FS', 0]]), A('B', 5, [['A', 'FS', 0]]), A('C', 5, [['B', 'FS', 0]]), A('X', 1)])
    expect(r.ok).toBe(false)
    const loop = r.issues.find(i => i.rule === 'logic-loop')!
    expect(loop.message).toContain('A → B → C → A')
    expect(r.activities.size).toBe(0)
  })

  it('refuses a predecessor that does not exist', () => {
    const r = run([A('A', 5), A('B', 5, [['44', 'FS', 0]])])
    expect(r.ok).toBe(false)
    expect(r.issues[0]).toMatchObject({ rule: 'unknown-predecessor', activity: 'B' })
  })

  it('refuses duplicate codes', () => {
    const r = run([A('A', 5), A('A', 7)])
    expect(r.ok).toBe(false)
    expect(r.issues[0].rule).toBe('duplicate-code')
  })

  it('refuses a self link, a bad type, a fractional lag and a negative duration', () => {
    expect(run([A('A', 5, [['A', 'FS', 0]])]).issues[0].rule).toBe('self-link')
    expect(run([A('A', 5), A('B', 5, [['A', 'XX' as any, 0]])]).issues[0].rule).toBe('bad-relationship')
    expect(run([A('A', 5), A('B', 5, [['A', 'FS', 1.5]])]).issues[0].rule).toBe('bad-lag')
    expect(run([A('A', -3)]).issues[0].rule).toBe('bad-duration')
  })
})

describe('scheduler — WBS summaries', () => {
  const net = () => [
    A('2', 423),                                  // summary: its own 423 days must be ignored
    A('2.1', 100, [], { parentCode: '2' }),
    A('2.2', 150, [['2.1', 'SS', 30]], { parentCode: '2' }),
    A('6', 50, [['2', 'FS', 0]]),                 // follows the summary
  ]

  it('rolls a summary up from its activities instead of scheduling its own duration', () => {
    const r = run(net())
    const s = get(r, '2')
    expect(s.isSummary).toBe(true)
    expect([s.es, s.ef]).toEqual([0, 180])
  })

  it('makes a link from a summary wait for every activity in it', () => {
    const r = run(net())
    expect(get(r, '6').es).toBe(180)
    expect(r.issues.some(i => i.rule === 'summary-link')).toBe(true)
  })

  it('passes a link to a summary on to every activity inside it', () => {
    const r = run([A('0', 20), A('2', 1, [['0', 'FS', 0]]), A('2.1', 10, [], { parentCode: '2' }), A('2.2', 10, [], { parentCode: '2' })])
    expect(get(r, '2.1').es).toBe(20)
    expect(get(r, '2.2').es).toBe(20)
  })
})

describe('scheduler — actual progress and the data date', () => {
  it('keeps a completed activity on its actual dates and moves its successors', () => {
    // Planned 100 days; actually finished on day 220. The successor has to wait.
    const r = run([A('A', 100, [], { actualStart: 0, actualFinish: 220 }), A('B', 50, [['A', 'FS', 0]])], { dataDate: 240 })
    expect([get(r, 'A').es, get(r, 'A').ef]).toEqual([0, 220])
    expect(get(r, 'A').status).toBe('complete')
    expect(get(r, 'B').es).toBe(240)
  })

  it('forecasts an in-progress activity from the data date with its remaining work', () => {
    const r = run([A('A', 100, [], { actualStart: 10, percentComplete: 40 })], { dataDate: 50 })
    expect(get(r, 'A').es).toBe(10)
    expect(get(r, 'A').remaining).toBe(60)
    expect(get(r, 'A').ef).toBe(110)
  })

  it('does not start unstarted work in the past', () => {
    const r = run([A('A', 10)], { dataDate: 90 })
    expect(get(r, 'A').es).toBe(90)
    expect(get(r, 'A').drivenBy).toBe('data-date')
    expect(r.issues.some(i => i.rule === 'no-actual-start')).toBe(true)
  })
})

describe('scheduler — calendars', () => {
  it('stops winter-restricted work for the shutdown and resumes after it', () => {
    // Day 24 is 1 Dec 2025. Ninety days of RCC from 1 Nov (day -6 is 1 Nov;
    // use day 0 = 7 Nov): 24 working days to 30 Nov, then nothing until 1 Mar.
    const c = clock()
    const r = run([A('RCC', 90, [], { calendar: 'winter_restricted' })])
    const finish = c.iso(get(r, 'RCC').ef - 1)
    expect(finish >= '2026-04-01').toBe(true)
    // The same duration on a seven-day calendar ends in early February.
    const plain = run([A('RCC', 90)])
    expect(c.iso(get(plain, 'RCC').ef - 1)).toBe('2026-02-04')
  })

  it('keeps the longest path unbroken when winter pushes an activity past its predecessor', () => {
    // A ends on day 30 (7 Dec 2025), inside the shutdown. B cannot start until
    // 1 Mar 2026, but A is still what it waits for: both are on the path.
    const r = run([A('A', 30), A('B', 10, [['A', 'FS', 0]], { calendar: 'winter_restricted' })])
    expect(clock().iso(get(r, 'B').es)).toBe('2026-03-01')
    expect(r.longestPath).toEqual(['A', 'B'])
  })

  it('skips Sundays on a six-day calendar', () => {
    const c = clock()
    const r = run([A('A', 6, [], { calendar: 'six_day' })])
    // 7 Nov 2025 is a Friday: Fri, Sat, (Sun off), Mon, Tue, Wed, Thu.
    expect(c.iso(get(r, 'A').es)).toBe('2025-11-07')
    expect(c.iso(get(r, 'A').ef - 1)).toBe('2025-11-13')
  })
})

describe('scheduler — network-quality warnings', () => {
  it('flags a lag that equals the gap between planned starts', () => {
    const r = run([A('A', 100, [], { plannedStart: 0 }), A('B', 100, [['A', 'SS', 242]], { plannedStart: 242 })])
    expect(r.issues.some(i => i.rule === 'date-derived-lag' && i.activity === 'B')).toBe(true)
  })

  it('flags open starts and open ends in the contract network', () => {
    const r = run([A('START', 0, [], { isMilestone: true }), A('A', 10, [['START', 'FS', 0]]), A('B', 5), A('C', 20, [['A', 'FS', 0]])])
    // START is the commencement milestone and may stand alone; B has nothing before or after it.
    expect(r.issues.filter(i => i.rule === 'open-start').map(i => i.activity)).toEqual(['B'])
    expect(r.issues.filter(i => i.rule === 'open-end').map(i => i.activity)).toEqual(['B'])
  })

  it('flags an activity that starts from nothing even when it is first', () => {
    const r = run([A('A', 10), A('B', 5, [['A', 'FS', 0]])])
    expect(r.issues.filter(i => i.rule === 'open-start').map(i => i.activity)).toEqual(['A'])
  })

  it('flags a milestone that carries a duration and schedules the duration', () => {
    const r = run([A('TRIAL', 182, [], { isMilestone: true })])
    expect(r.issues.some(i => i.rule === 'milestone-with-duration')).toBe(true)
    expect(get(r, 'TRIAL').ef).toBe(182)
  })
})
