/**
 * Defensible Time Impact Analysis (TIA) Module.
 *
 * Implements the Society of Construction Law (SCL) Delay and Disruption Protocol
 * and FIDIC / CPWD / J&K EPC contractual standards:
 * - Quantifies schedule slippage by fragnet / delay insertion into the CPM network.
 * - Distinguishes between critical delays (which extend project completion) and
 *   non-critical delays (which merely consume total float).
 * - Distinguishes excusable employer/statutory delays from non-excusable delays.
 * - Prevents arithmetic double-counting of parallel/concurrent delay events.
 */

import { calculateCpm, CpmActivityInput, CpmOptions } from './cpm-scheduler'

export interface DelayEvent {
  id: string
  source: 'approval' | 'task' | 'weather' | 'dispute'
  ref: string
  title: string
  affectedWbsCode: string
  delayDays: number
  eventDate?: string
  isExcusable: boolean // Employer risk / Force Majeure (entitled to EOT)
  isCompensable?: boolean // Entitled to cost/overhead
  reason?: string
}

export interface TiaEventResult {
  eventId: string
  ref: string
  title: string
  source: 'approval' | 'task' | 'weather' | 'dispute'
  affectedWbsCode: string
  claimedDays: number
  preDelayCompletionDay: number
  impactedCompletionDay: number
  scheduleSlipDays: number
  floatConsumedDays: number
  isCriticalImpact: boolean
  isExcusable: boolean
  defensibleEotDays: number
  legalRationale: string
}

export interface TiaSummary {
  events: TiaEventResult[]
  baseProjectDuration: number
  impactedProjectDuration: number
  totalDefensibleEotDays: number
  revisedCompletionDay: number
  totalGrossDelayClaimed: number
  floatAbsorptionDays: number
  concurrencyMitigationDays: number
}

export function runTimeImpactAnalysis(
  baseActivities: CpmActivityInput[],
  delayEvents: DelayEvent[],
  options: CpmOptions = {},
): TiaSummary {
  // 1. Unimpacted baseline CPM calculation
  const baseResult = calculateCpm(baseActivities, options)
  const baseDuration = baseResult.projectDuration

  const eventResults: TiaEventResult[] = []
  let totalGrossDays = 0

  // 2. Evaluate each delay event individually (Independent Window TIA)
  for (const event of delayEvents) {
    totalGrossDays += event.delayDays

    const affected = baseActivities.find(a => a.id === event.affectedWbsCode)
    if (!affected) {
      eventResults.push({
        eventId: event.id,
        ref: event.ref,
        title: event.title,
        source: event.source,
        affectedWbsCode: event.affectedWbsCode,
        claimedDays: event.delayDays,
        preDelayCompletionDay: baseDuration,
        impactedCompletionDay: baseDuration,
        scheduleSlipDays: 0,
        floatConsumedDays: 0,
        isCriticalImpact: false,
        isExcusable: event.isExcusable,
        defensibleEotDays: 0,
        legalRationale: `Task ${event.affectedWbsCode} not found in CPM network. No schedule impact.`,
      })
      continue
    }

    const taskBaseResult = baseResult.activities.get(event.affectedWbsCode)
    const initialFloat = taskBaseResult?.totalFloat ?? 0

    // Construct impacted network for this single event
    const singleImpactedActivities = baseActivities.map(a => {
      if (a.id !== event.affectedWbsCode) return { ...a }
      if (event.source === 'approval') {
        // Approval delay pushes start floor
        const currentFloor = a.earliestStartFloor ?? a.plannedStartDay ?? 0
        return {
          ...a,
          earliestStartFloor: currentFloor + event.delayDays,
        }
      } else {
        // Task / weather delay expands activity duration
        return {
          ...a,
          duration: a.duration + event.delayDays,
        }
      }
    })

    const singleImpactResult = calculateCpm(singleImpactedActivities, options)
    const singleImpactedDuration = singleImpactResult.projectDuration
    const scheduleSlip = Math.max(0, singleImpactedDuration - baseDuration)
    const floatConsumed = Math.min(initialFloat, Math.max(0, event.delayDays - scheduleSlip))
    const isCritical = scheduleSlip > 0 || (taskBaseResult?.isCritical ?? false)
    const defensibleEot = event.isExcusable ? scheduleSlip : 0

    let rationale = ''
    if (!event.isExcusable) {
      rationale = `Non-excusable contractor delay. Even if causing ${scheduleSlip}d slippage, no EOT is legally awardable.`
    } else if (scheduleSlip > 0) {
      rationale = `Critical path impacted: pushed project completion by ${scheduleSlip} day(s). Float exhausted.`
    } else {
      rationale = `Non-critical delay: absorbed by available activity float (${initialFloat}d available, ${floatConsumed}d consumed). Zero completion impact.`
    }

    eventResults.push({
      eventId: event.id,
      ref: event.ref,
      title: event.title,
      source: event.source,
      affectedWbsCode: event.affectedWbsCode,
      claimedDays: event.delayDays,
      preDelayCompletionDay: baseDuration,
      impactedCompletionDay: singleImpactedDuration,
      scheduleSlipDays: scheduleSlip,
      floatConsumedDays: floatConsumed,
      isCriticalImpact: isCritical,
      isExcusable: event.isExcusable,
      defensibleEotDays: defensibleEot,
      legalRationale: rationale,
    })
  }

  // 3. Combined Multi-Event Simulation (Resolves Concurrency)
  // When multiple events run in parallel, simple summation over-counts. The joint CPM simulation
  // establishes the true composite terminal date.
  const excusableEvents = delayEvents.filter(e => e.isExcusable)
  const combinedActivities = baseActivities.map(a => {
    const relevantEvents = excusableEvents.filter(e => e.affectedWbsCode === a.id)
    if (relevantEvents.length === 0) return { ...a }

    let addedDuration = 0
    let maxFloorAdvance = 0

    for (const ev of relevantEvents) {
      if (ev.source === 'approval') {
        maxFloorAdvance = Math.max(maxFloorAdvance, ev.delayDays)
      } else {
        addedDuration += ev.delayDays
      }
    }

    const currentFloor = a.earliestStartFloor ?? a.plannedStartDay ?? 0
    return {
      ...a,
      duration: a.duration + addedDuration,
      earliestStartFloor: maxFloorAdvance > 0 ? currentFloor + maxFloorAdvance : a.earliestStartFloor,
    }
  })

  const combinedResult = calculateCpm(combinedActivities, options)
  const compositeDuration = combinedResult.projectDuration
  const compositeNetEot = Math.max(0, compositeDuration - baseDuration)

  const sumIndividualEot = eventResults.reduce((s, r) => s + r.defensibleEotDays, 0)
  const concurrencyMitigation = Math.max(0, sumIndividualEot - compositeNetEot)
  const totalFloatAbsorbed = eventResults.reduce((s, r) => s + r.floatConsumedDays, 0)

  return {
    events: eventResults,
    baseProjectDuration: baseDuration,
    impactedProjectDuration: compositeDuration,
    totalDefensibleEotDays: compositeNetEot,
    revisedCompletionDay: baseDuration + compositeNetEot,
    totalGrossDelayClaimed: totalGrossDays,
    floatAbsorptionDays: totalFloatAbsorbed,
    concurrencyMitigationDays: concurrencyMitigation,
  }
}
