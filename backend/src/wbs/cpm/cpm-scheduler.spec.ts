import { calculateCpm, CpmActivityInput } from './cpm-scheduler'

describe('Pure CPM Scheduler (calculateCpm)', () => {
  it('correctly calculates a simple sequential Finish-to-Start chain', () => {
    const activities: CpmActivityInput[] = [
      { id: 'A', duration: 10 },
      { id: 'B', duration: 20, dependencies: [{ predecessorId: 'A', type: 'FS', lag: 0 }] },
      { id: 'C', duration: 15, dependencies: [{ predecessorId: 'B', type: 'FS', lag: 0 }] },
    ]

    const result = calculateCpm(activities)

    expect(result.hasCycle).toBe(false)
    expect(result.projectDuration).toBe(45) // 10 + 20 + 15
    expect(result.criticalPath).toEqual(['A', 'B', 'C'])

    const a = result.activities.get('A')!
    expect(a.earlyStart).toBe(0)
    expect(a.earlyFinish).toBe(10)
    expect(a.lateStart).toBe(0)
    expect(a.lateFinish).toBe(10)
    expect(a.totalFloat).toBe(0)

    const b = result.activities.get('B')!
    expect(b.earlyStart).toBe(10)
    expect(b.earlyFinish).toBe(30)
    expect(b.totalFloat).toBe(0)

    const c = result.activities.get('C')!
    expect(c.earlyStart).toBe(30)
    expect(c.earlyFinish).toBe(45)
    expect(c.totalFloat).toBe(0)
  })

  it('handles FS with positive lag', () => {
    const activities: CpmActivityInput[] = [
      { id: 'A', duration: 10 },
      { id: 'B', duration: 15, dependencies: [{ predecessorId: 'A', type: 'FS', lag: 5 }] },
    ]

    const result = calculateCpm(activities)
    expect(result.projectDuration).toBe(30) // 10 + 5 + 15

    const b = result.activities.get('B')!
    expect(b.earlyStart).toBe(15)
    expect(b.earlyFinish).toBe(30)
  })

  it('handles Start-to-Start (SS) overlap with lag', () => {
    // A starts at 0 (duration 30). B has SS+10 with A (starts at 10, duration 25).
    const activities: CpmActivityInput[] = [
      { id: 'A', duration: 30 },
      { id: 'B', duration: 25, dependencies: [{ predecessorId: 'A', type: 'SS', lag: 10 }] },
    ]

    const result = calculateCpm(activities)
    const b = result.activities.get('B')!
    expect(b.earlyStart).toBe(10)
    expect(b.earlyFinish).toBe(35) // 10 + 25 = 35
    expect(result.projectDuration).toBe(35) // B governs project finish
    expect(result.criticalPath).toContain('B')
  })

  it('handles Finish-to-Finish (FF) constraint', () => {
    // A duration 30. B duration 15. B has FF+5 on A (B cannot finish before A finishes + 5).
    // EF_A = 30 -> EF_B >= 35 -> ES_B >= 35 - 15 = 20.
    const activities: CpmActivityInput[] = [
      { id: 'A', duration: 30 },
      { id: 'B', duration: 15, dependencies: [{ predecessorId: 'A', type: 'FF', lag: 5 }] },
    ]

    const result = calculateCpm(activities)
    const b = result.activities.get('B')!
    expect(b.earlyFinish).toBe(35)
    expect(b.earlyStart).toBe(20)
  })

  it('computes positive float and separates critical from non-critical paths', () => {
    // A (10) -> B (20) -> D (10) = 40 days (Critical Path)
    // A (10) -> C (10) -> D (10) = 30 days (Float = 10 on C)
    const activities: CpmActivityInput[] = [
      { id: 'A', duration: 10 },
      { id: 'B', duration: 20, dependencies: [{ predecessorId: 'A', type: 'FS', lag: 0 }] },
      { id: 'C', duration: 10, dependencies: [{ predecessorId: 'A', type: 'FS', lag: 0 }] },
      {
        id: 'D',
        duration: 10,
        dependencies: [
          { predecessorId: 'B', type: 'FS', lag: 0 },
          { predecessorId: 'C', type: 'FS', lag: 0 },
        ],
      },
    ]

    const result = calculateCpm(activities)
    expect(result.projectDuration).toBe(40)
    expect(result.criticalPath).toEqual(['A', 'B', 'D'])

    const c = result.activities.get('C')!
    expect(c.earlyStart).toBe(10)
    expect(c.earlyFinish).toBe(20)
    expect(c.lateStart).toBe(20)
    expect(c.lateFinish).toBe(30)
    expect(c.totalFloat).toBe(10)
    expect(c.freeFloat).toBe(10)
    expect(c.isCritical).toBe(false)
  })

  it('respects external earliestStartFloor (e.g. Liaison approval gating)', () => {
    const activities: CpmActivityInput[] = [
      { id: 'A', duration: 10, earliestStartFloor: 25 },
      { id: 'B', duration: 15, dependencies: [{ predecessorId: 'A', type: 'FS', lag: 0 }] },
    ]

    const result = calculateCpm(activities)
    const a = result.activities.get('A')!
    expect(a.earlyStart).toBe(25)
    expect(a.earlyFinish).toBe(35)

    const b = result.activities.get('B')!
    expect(b.earlyStart).toBe(35)
    expect(b.earlyFinish).toBe(50)
    expect(result.projectDuration).toBe(50)
  })

  it('respects target fixed duration when project finishes early', () => {
    const activities: CpmActivityInput[] = [
      { id: 'A', duration: 100 },
    ]

    // Fixed contract duration = 912 days
    const result = calculateCpm(activities, { targetDuration: 912 })
    expect(result.projectDuration).toBe(912)

    const a = result.activities.get('A')!
    expect(a.earlyFinish).toBe(100)
    expect(a.lateFinish).toBe(912)
    expect(a.totalFloat).toBe(812)
    expect(a.isCritical).toBe(false)
  })

  it('detects cycles gracefully without hanging or crashing', () => {
    // Cyclic network: A -> B -> C -> A
    const activities: CpmActivityInput[] = [
      { id: 'A', duration: 10, dependencies: [{ predecessorId: 'C', type: 'FS', lag: 0 }] },
      { id: 'B', duration: 10, dependencies: [{ predecessorId: 'A', type: 'FS', lag: 0 }] },
      { id: 'C', duration: 10, dependencies: [{ predecessorId: 'B', type: 'FS', lag: 0 }] },
    ]

    const result = calculateCpm(activities)
    expect(result.hasCycle).toBe(true)
    expect(result.cycleNodes).toBeDefined()
    expect(result.activities.size).toBe(3)
  })
})
