/**
 * S-Curve & Tender Clause 16.3 Milestone Compliance Engine.
 *
 * Grounded in Dal Lake EPC Contract specifications:
 * - 30 Calendar Months (912 Days) capital completion window.
 * - Early vs Late ("Banana Curve") cumulative progress envelopes.
 * - Statutory Progress Milestones (GCC Clause 16.3):
 *     Stage 1: 1/8th of work (12.5%) at 1/4th of time (Month 7.5 / Day 228)
 *     Stage 2: 3/8ths of work (37.5%) at 1/2 of time (Month 15.0 / Day 456)
 *     Stage 3: 3/4ths of work (75.0%) at 3/4th of time (Month 22.5 / Day 684)
 *     Stage 4: 100% of work at full contract time (Month 30.0 / Day 912)
 * - Automatic Liquidated Damages (LD) exposure calculation (0.05%/day up to 10%).
 */

export interface SCurveTaskInput {
  id: string
  title: string
  weight: number // percentage (0 - 100)
  earlyStartDay: number
  earlyFinishDay: number
  lateStartDay: number
  lateFinishDay: number
  actualStartDay?: number
  actualEndDay?: number
  progressPct: number
  isMilestone?: boolean
}

export interface MonthlyProgressPoint {
  monthIndex: number
  monthLabel: string
  daysFromStart: number
  dateStr: string
  earlyPlannedCumulativePct: number
  latePlannedCumulativePct: number
  actualCumulativePct: number | null
  forecastCumulativePct: number
  clause16TargetPct: number | null
  clause16StageName: string | null
  isPassed: boolean
}

export interface Clause16GateEvaluation {
  stage: string
  targetMonth: number
  targetDay: number
  targetPct: number
  scheduledPlannedPct: number
  actualEarnedPct: number
  shortfallPct: number
  status: 'COMPLIANT' | 'WARNING' | 'BREACH_LIABLE_FOR_LD'
  remedyAction: string
}

export interface SCurveSummary {
  periods: MonthlyProgressPoint[]
  gates: Clause16GateEvaluation[]
  contractDays: number
  contractTotalMonths: number
  currentElapsedDays: number
  currentElapsedPct: number
  currentActualProgress: number
  currentPlannedProgress: number
  scheduleVariancePct: number
  schedulePerformanceIndex: number // SPI = EV / PV
  overallStatus: 'ON_TRACK' | 'SLIGHT_DELAY' | 'CRITICAL_DELAY'
}

export function calculateSCurve(
  tasks: SCurveTaskInput[],
  projectStartDate = '2025-11-07',
  contractDays = 912,
  dataDateStr?: string,
): SCurveSummary {
  const start = new Date(projectStartDate).getTime()
  const today = dataDateStr ? new Date(dataDateStr).getTime() : new Date().getTime()
  const currentElapsedDays = Math.max(0, Math.min(contractDays, Math.round((today - start) / 86400000)))
  const currentElapsedPct = +((currentElapsedDays / contractDays) * 100).toFixed(1)

  // Normalize weights across non-milestone capital execution tasks
  const capitalTasks = tasks.filter(t => !t.isMilestone && t.weight > 0)
  const totalWeight = capitalTasks.reduce((s, t) => s + t.weight, 0)
  const normTasks = capitalTasks.map(t => ({
    ...t,
    normWeight: totalWeight > 0 ? (t.weight / totalWeight) * 100 : 0,
  }))

  const totalMonths = 30
  const periods: MonthlyProgressPoint[] = []

  // Generate 30 monthly time steps (each month is ~30.4 days)
  for (let m = 1; m <= totalMonths; m++) {
    const dayOffset = Math.min(contractDays, Math.round((m / totalMonths) * contractDays))
    const d = new Date(start + dayOffset * 86400000)
    const dateStr = d.toISOString().split('T')[0]
    const monthLabel = `M${m} (${d.toLocaleString('default', { month: 'short', year: '2-digit' })})`

    // 1. Early Planned cumulative % at dayOffset
    let earlyCum = 0
    let lateCum = 0
    let actualCum: number | null = null
    let forecastCum = 0

    for (const t of normTasks) {
      // Early schedule curve
      if (t.earlyFinishDay <= dayOffset) {
        earlyCum += t.normWeight
      } else if (t.earlyStartDay < dayOffset) {
        const span = Math.max(1, t.earlyFinishDay - t.earlyStartDay)
        const portion = (dayOffset - t.earlyStartDay) / span
        earlyCum += t.normWeight * Math.min(1, portion)
      }

      // Late schedule curve ("banana curve" lower boundary)
      if (t.lateFinishDay <= dayOffset) {
        lateCum += t.normWeight
      } else if (t.lateStartDay < dayOffset) {
        const span = Math.max(1, t.lateFinishDay - t.lateStartDay)
        const portion = (dayOffset - t.lateStartDay) / span
        lateCum += t.normWeight * Math.min(1, portion)
      }

      // Forecast curve (combines earned value with remaining work)
      if (dayOffset <= currentElapsedDays) {
        // In past: equal to actual
        const taskActualProgress = (Number(t.progressPct) || 0) / 100
        forecastCum += t.normWeight * taskActualProgress
      } else {
        // Beyond data date: project forward from current actual
        const currentProg = (Number(t.progressPct) || 0) / 100
        const remainingWeight = t.normWeight * (1 - currentProg)
        const remainingDays = Math.max(1, t.earlyFinishDay - currentElapsedDays)
        if (dayOffset >= t.earlyFinishDay) {
          forecastCum += t.normWeight
        } else if (dayOffset > currentElapsedDays) {
          const daysIntoRemaining = dayOffset - currentElapsedDays
          forecastCum += (t.normWeight * currentProg) + (remainingWeight * (daysIntoRemaining / remainingDays))
        }
      }
    }

    // Actual progress only for past/current periods
    if (dayOffset <= currentElapsedDays + 15) {
      let curActual = 0
      for (const t of normTasks) {
        curActual += t.normWeight * ((Number(t.progressPct) || 0) / 100)
      }
      actualCum = +curActual.toFixed(1)
    }

    // Clause 16.3 Milestone Gates
    let clause16Target: number | null = null
    let clause16Stage: string | null = null

    if (m === 8) { // ~ Month 7.5
      clause16Target = 12.5
      clause16Stage = 'Stage 1 (1/8th Work @ 1/4th Time)'
    } else if (m === 15) { // Month 15
      clause16Target = 37.5
      clause16Stage = 'Stage 2 (3/8th Work @ 1/2 Time)'
    } else if (m === 23) { // ~ Month 22.5
      clause16Target = 75.0
      clause16Stage = 'Stage 3 (3/4th Work @ 3/4th Time)'
    } else if (m === 30) {
      clause16Target = 100.0
      clause16Stage = 'Stage 4 (100% Work @ Full Time)'
    }

    periods.push({
      monthIndex: m,
      monthLabel,
      daysFromStart: dayOffset,
      dateStr,
      earlyPlannedCumulativePct: +earlyCum.toFixed(1),
      latePlannedCumulativePct: +lateCum.toFixed(1),
      actualCumulativePct: actualCum,
      forecastCumulativePct: +Math.min(100, forecastCum).toFixed(1),
      clause16TargetPct: clause16Target,
      clause16StageName: clause16Stage,
      isPassed: dayOffset <= currentElapsedDays,
    })
  }

  // ── Clause 16.3 Milestone Gate Audit ─────────────────────────────────────
  const gateDefinitions = [
    { stage: 'Stage 1 (1/4 Time)', targetMonth: 7.5, targetDay: 228, targetPct: 12.5 },
    { stage: 'Stage 2 (1/2 Time)', targetMonth: 15.0, targetDay: 456, targetPct: 37.5 },
    { stage: 'Stage 3 (3/4 Time)', targetMonth: 22.5, targetDay: 684, targetPct: 75.0 },
    { stage: 'Stage 4 (Full Completion)', targetMonth: 30.0, targetDay: 912, targetPct: 100.0 },
  ]

  let currentActualProg = 0
  for (const t of normTasks) {
    currentActualProg += t.normWeight * ((Number(t.progressPct) || 0) / 100)
  }
  currentActualProg = +currentActualProg.toFixed(1)

  // Current planned progress
  const currentPeriod = periods.find(p => p.daysFromStart >= currentElapsedDays) ?? periods[0]
  const currentPlannedProg = currentPeriod.earlyPlannedCumulativePct

  const gates: Clause16GateEvaluation[] = gateDefinitions.map(g => {
    const isPassed = currentElapsedDays >= g.targetDay
    const scheduledPlanned = g.targetPct
    const actualEarned = isPassed ? currentActualProg : (currentElapsedDays / g.targetDay) * currentActualProg
    const shortfall = Math.max(0, g.targetPct - actualEarned)

    let status: 'COMPLIANT' | 'WARNING' | 'BREACH_LIABLE_FOR_LD' = 'COMPLIANT'
    let remedy = 'Milestone on schedule. No action required.'

    if (isPassed && shortfall > 0) {
      status = 'BREACH_LIABLE_FOR_LD'
      remedy = `Statutory breach of Clause 16.3: Shortfall of ${shortfall.toFixed(1)}%. Employer entitled to deduct LD @ 0.05%/day under GCC Cl. 8.1.`
    } else if (!isPassed && shortfall > 15) {
      status = 'WARNING'
      remedy = `High risk of milestone default: Progress lagging by ${shortfall.toFixed(1)}%. Accelerate critical sewer laying & civil works.`
    }

    return {
      stage: g.stage,
      targetMonth: g.targetMonth,
      targetDay: g.targetDay,
      targetPct: g.targetPct,
      scheduledPlannedPct: scheduledPlanned,
      actualEarnedPct: +actualEarned.toFixed(1),
      shortfallPct: +shortfall.toFixed(1),
      status,
      remedyAction: remedy,
    }
  })

  const sv = +(currentActualProg - currentPlannedProg).toFixed(1)
  const spi = currentPlannedProg > 0 ? +(currentActualProg / currentPlannedProg).toFixed(2) : 1.0

  let overallStatus: 'ON_TRACK' | 'SLIGHT_DELAY' | 'CRITICAL_DELAY' = 'ON_TRACK'
  if (spi < 0.75 || sv < -15) {
    overallStatus = 'CRITICAL_DELAY'
  } else if (spi < 0.90 || sv < -5) {
    overallStatus = 'SLIGHT_DELAY'
  }

  return {
    periods,
    gates,
    contractDays,
    contractTotalMonths: totalMonths,
    currentElapsedDays,
    currentElapsedPct,
    currentActualProgress: currentActualProg,
    currentPlannedProgress: currentPlannedProg,
    scheduleVariancePct: sv,
    schedulePerformanceIndex: spi,
    overallStatus,
  }
}
