/**
 * The one thing a site engineer wants from the cube register: what do I do with
 * this cube today.
 *
 * The record carries three separate statuses — status7d (PENDING / ON_TRACK /
 * AT_RISK / FAILED), status28d (PENDING / PASSED / FAILED) and overallStatus
 * (CAST / 7D_TESTED / COMPLETED_PASSED / COMPLETED_FAILED) — and none of them
 * answers it alone. overallStatus says a cube is CAST but not whether its break
 * is due; status7d says AT_RISK but not whether anyone still has to crush it.
 *
 * So the stage is derived here, once, on the server, rather than reimplemented
 * by each client from three columns and a date comparison.
 */

export type CubeStage =
  | 'CAST'      // cast, 7-day break not due yet
  | '7D_DUE'    // 7-day break is due or overdue
  | '7D_TESTED' // 7-day break done, 28-day break not due yet
  | '28D_DUE'   // 28-day break is due or overdue
  | 'PASSED'    // 28-day break done, met fck
  | 'FAILED'    // 28-day break done, missed fck

export interface CubeStatusFields {
  overallStatus?: string | null
  status7d?: string | null
  status28d?: string | null
  /** cast_date + 7. When the break is due, not when it happened. */
  test7dDate?: string | null
  /** cast_date + 28. */
  test28dDate?: string | null
}

/** ISO dates compare correctly as strings, and only when both are present. */
function dueBy(date: string | null | undefined, today: string): boolean {
  return typeof date === 'string' && date.length > 0 && date <= today
}

/**
 * `today` is passed in rather than read from the clock so this stays pure and
 * so a caller listing a whole project computes the date once.
 */
export function cubeStage(cube: CubeStatusFields, today: string): CubeStage {
  // A completed break is terminal: the result is the result, whatever the
  // earlier columns say about it.
  if (cube.overallStatus === 'COMPLETED_PASSED' || cube.status28d === 'PASSED') return 'PASSED'
  if (cube.overallStatus === 'COMPLETED_FAILED' || cube.status28d === 'FAILED') return 'FAILED'

  // 7-day break recorded. status7d leaves PENDING the moment loads are entered,
  // so it is what says the break happened — overallStatus can lag behind it.
  const sevenDayDone = !!cube.status7d && cube.status7d !== 'PENDING'
  if (sevenDayDone || cube.overallStatus === '7D_TESTED') {
    return dueBy(cube.test28dDate, today) ? '28D_DUE' : '7D_TESTED'
  }

  return dueBy(cube.test7dDate, today) ? '7D_DUE' : 'CAST'
}

/**
 * The 7-day break projected a 28-day strength below the required fck, and the
 * 28-day break has not yet settled the question.
 *
 * Kept separate from the stage on purpose. A cube can be both at risk and due
 * for its 28-day break, and collapsing them into one badge loses whichever the
 * ordering demotes — the engineer needs to know the cube is failing AND that
 * someone still has to crush it.
 *
 * It stops mattering the moment the cube is actually crushed at 28 days.
 * status7d is never rewritten by the 28-day break, so a cube that projected
 * low and then passed keeps AT_RISK in that column for good; reading it
 * unconditionally left a passed cube counted against the at-risk KPI. A
 * measured result supersedes a projection.
 */
export function cubeAtRisk(cube: CubeStatusFields): boolean {
  const settled = cube.status28d === 'PASSED' || cube.status28d === 'FAILED'
    || cube.overallStatus === 'COMPLETED_PASSED' || cube.overallStatus === 'COMPLETED_FAILED'
  if (settled) return false
  return cube.status7d === 'AT_RISK' || cube.status7d === 'FAILED'
}
