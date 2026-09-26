import { calculateSCurve, SCurveTaskInput } from './s-curve-calculator'

describe('S-Curve & Clause 16.3 Milestone Compliance Engine', () => {
  const sampleTasks: SCurveTaskInput[] = [
    {
      id: '1',
      title: 'Survey & Vetting',
      weight: 5,
      earlyStartDay: 0,
      earlyFinishDay: 86,
      lateStartDay: 0,
      lateFinishDay: 86,
      progressPct: 100,
    },
    {
      id: '2',
      title: 'Sewer Network Civil',
      weight: 35,
      earlyStartDay: 86,
      earlyFinishDay: 509,
      lateStartDay: 86,
      lateFinishDay: 509,
      progressPct: 20,
    },
    {
      id: '3',
      title: 'IPS Civil',
      weight: 16,
      earlyStartDay: 86,
      earlyFinishDay: 509,
      lateStartDay: 86,
      lateFinishDay: 509,
      progressPct: 10,
    },
    {
      id: '4',
      title: 'STP Construction',
      weight: 18,
      earlyStartDay: 86,
      earlyFinishDay: 600,
      lateStartDay: 86,
      lateFinishDay: 600,
      progressPct: 0,
    },
    {
      id: '5',
      title: 'Rising Mains',
      weight: 5,
      earlyStartDay: 145,
      earlyFinishDay: 510,
      lateStartDay: 145,
      lateFinishDay: 510,
      progressPct: 0,
    },
    {
      id: '6',
      title: 'E&M Works',
      weight: 14,
      earlyStartDay: 328,
      earlyFinishDay: 724,
      lateStartDay: 328,
      lateFinishDay: 724,
      progressPct: 0,
    },
    {
      id: '7',
      title: 'Road Reinstatement',
      weight: 2,
      earlyStartDay: 236,
      earlyFinishDay: 912,
      lateStartDay: 236,
      lateFinishDay: 912,
      progressPct: 0,
    },
    {
      id: '8',
      title: 'Testing & Commissioning',
      weight: 2.5,
      earlyStartDay: 693,
      earlyFinishDay: 912,
      lateStartDay: 693,
      lateFinishDay: 912,
      progressPct: 0,
    },
    {
      id: '9',
      title: 'Free Trial Run',
      weight: 2.5,
      earlyStartDay: 730,
      earlyFinishDay: 912,
      lateStartDay: 730,
      lateFinishDay: 912,
      progressPct: 0,
    },
  ]

  it('generates 30 monthly time steps culminating at 100% planned progress', () => {
    const summary = calculateSCurve(sampleTasks, '2025-11-07', 912)

    expect(summary.periods.length).toBe(30)
    expect(summary.contractDays).toBe(912)

    // Month 30 early planned cumulative should be 100%
    const last = summary.periods[29]
    expect(last.earlyPlannedCumulativePct).toBe(100)
    expect(last.latePlannedCumulativePct).toBe(100)
  })

  it('audits the 4 statutory Clause 16.3 milestone gates', () => {
    // Current date set to Month 10 (~300 days into the contract)
    const summary = calculateSCurve(sampleTasks, '2025-11-07', 912, '2026-09-03')

    expect(summary.gates.length).toBe(4)

    const stage1 = summary.gates[0]
    expect(stage1.targetDay).toBe(228)
    expect(stage1.targetPct).toBe(12.5)

    const stage2 = summary.gates[1]
    expect(stage2.targetDay).toBe(456)
    expect(stage2.targetPct).toBe(37.5)

    const stage3 = summary.gates[2]
    expect(stage3.targetDay).toBe(684)
    expect(stage3.targetPct).toBe(75.0)

    const stage4 = summary.gates[3]
    expect(stage4.targetDay).toBe(912)
    expect(stage4.targetPct).toBe(100.0)
  })
})
