import { runTimeImpactAnalysis, DelayEvent } from './time-impact-analysis'
import { CpmActivityInput } from './cpm-scheduler'

describe('Defensible Time Impact Analysis (TIA)', () => {
  it('awards defensible EOT when an excusable event delays a critical activity', () => {
    // A (20d) -> B (30d) = 50d total project
    const activities: CpmActivityInput[] = [
      { id: 'A', duration: 20 },
      { id: 'B', duration: 30, dependencies: [{ predecessorId: 'A', type: 'FS', lag: 0 }] },
    ]

    const delay: DelayEvent = {
      id: 'EV-1',
      ref: 'LCMA-CLEARANCE-01',
      title: 'LCMA Tree Felling Permission Delay',
      affectedWbsCode: 'A',
      delayDays: 15,
      source: 'approval',
      isExcusable: true,
    }

    const summary = runTimeImpactAnalysis(activities, [delay])
    expect(summary.baseProjectDuration).toBe(50)
    expect(summary.impactedProjectDuration).toBe(65) // 50 + 15
    expect(summary.totalDefensibleEotDays).toBe(15)

    const eventResult = summary.events[0]
    expect(eventResult.scheduleSlipDays).toBe(15)
    expect(eventResult.defensibleEotDays).toBe(15)
    expect(eventResult.floatConsumedDays).toBe(0)
    expect(eventResult.isCriticalImpact).toBe(true)
  })

  it('absorbs delay into float without awarding EOT when off-path activity is delayed', () => {
    // Critical: A (20d) -> B (40d) = 60d
    // Off-path: A (20d) -> C (10d) [Float = 30d]
    const activities: CpmActivityInput[] = [
      { id: 'A', duration: 20 },
      { id: 'B', duration: 40, dependencies: [{ predecessorId: 'A', type: 'FS', lag: 0 }] },
      { id: 'C', duration: 10, dependencies: [{ predecessorId: 'A', type: 'FS', lag: 0 }] },
    ]

    const delay: DelayEvent = {
      id: 'EV-2',
      ref: 'DRAINAGE-REWORK',
      title: 'Minor pipe chamber rework',
      affectedWbsCode: 'C',
      delayDays: 15, // Less than 30d float
      source: 'task',
      isExcusable: true,
    }

    const summary = runTimeImpactAnalysis(activities, [delay])
    expect(summary.baseProjectDuration).toBe(60)
    expect(summary.impactedProjectDuration).toBe(60) // Unchanged!
    expect(summary.totalDefensibleEotDays).toBe(0)

    const eventResult = summary.events[0]
    expect(eventResult.scheduleSlipDays).toBe(0)
    expect(eventResult.defensibleEotDays).toBe(0)
    expect(eventResult.floatConsumedDays).toBe(15)
    expect(eventResult.legalRationale).toContain('Non-critical delay')
  })

  it('rejects EOT claim for contractor-caused (non-excusable) delays even on critical path', () => {
    const activities: CpmActivityInput[] = [
      { id: 'A', duration: 20 },
      { id: 'B', duration: 30, dependencies: [{ predecessorId: 'A', type: 'FS', lag: 0 }] },
    ]

    const delay: DelayEvent = {
      id: 'EV-3',
      ref: 'CONTRACTOR-DEFAULT-01',
      title: 'Contractor machinery breakdown on site',
      affectedWbsCode: 'A',
      delayDays: 10,
      source: 'task',
      isExcusable: false, // Contractor risk
    }

    const summary = runTimeImpactAnalysis(activities, [delay])
    expect(summary.totalDefensibleEotDays).toBe(0)
    expect(summary.events[0].scheduleSlipDays).toBe(10)
    expect(summary.events[0].defensibleEotDays).toBe(0)
    expect(summary.events[0].legalRationale).toContain('Non-excusable')
  })

  it('mitigates concurrency when two excusable delays occur on parallel branches', () => {
    // Root A (10d) branches to B (30d) and C (30d). Total = 40d.
    const activities: CpmActivityInput[] = [
      { id: 'A', duration: 10 },
      { id: 'B', duration: 30, dependencies: [{ predecessorId: 'A', type: 'FS', lag: 0 }] },
      { id: 'C', duration: 30, dependencies: [{ predecessorId: 'A', type: 'FS', lag: 0 }] },
    ]

    // Branch B delayed 10 days by Government event
    const delayB: DelayEvent = {
      id: 'EV-B',
      ref: 'GOVT-B',
      title: 'Power cut to IPS well sinking',
      affectedWbsCode: 'B',
      delayDays: 10,
      source: 'task',
      isExcusable: true,
    }

    // Branch C delayed 10 days by Government event concurrently
    const delayC: DelayEvent = {
      id: 'EV-C',
      ref: 'GOVT-C',
      title: 'Police traffic stoppage on sewer line',
      affectedWbsCode: 'C',
      delayDays: 10,
      source: 'task',
      isExcusable: true,
    }

    // Evaluated independently, each caused 10 days slip.
    // Sum = 20 days. But because they ran in parallel, the real extension is only 10 days!
    const summary = runTimeImpactAnalysis(activities, [delayB, delayC])
    expect(summary.baseProjectDuration).toBe(40)
    expect(summary.impactedProjectDuration).toBe(50)
    expect(summary.totalDefensibleEotDays).toBe(10)
    expect(summary.concurrencyMitigationDays).toBe(10) // 20 - 10 = 10
  })
})
