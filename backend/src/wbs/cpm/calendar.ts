/**
 * Working calendars for the schedule.
 *
 * Srinagar's winter is not a risk to be averaged into a duration; for concrete,
 * bituminous work and some earthwork it is a near-certain stoppage. So an
 * activity carries a calendar, and its duration is counted in that calendar's
 * working days. PERT then only has to model what is genuinely uncertain.
 *
 * Every date in the scheduler is a day index from day 0 of the contract. A
 * calendar answers one question — is day i a working day — and the arithmetic
 * below is built on that alone.
 */

export type CalendarId = 'seven_day' | 'six_day' | 'winter_restricted'

export const CALENDARS: Record<CalendarId, string> = {
  seven_day: 'Seven-day week, no stoppages',
  six_day: 'Six-day week, Sunday off',
  winter_restricted: 'Seven-day week, no work in the winter shutdown',
}

/**
 * The annual shutdown for winter-restricted work, as month/day pairs.
 *
 * This is the team's existing definition — the PERT risk engine already treats
 * December to February as "the Srinagar sub-zero freeze". It is a planning
 * assumption, not a contract term: confirm it with the site before the
 * programme goes to UEED, and change it here if the answer differs.
 */
export const WINTER_SHUTDOWN = { from: { month: 12, day: 1 }, to: { month: 2, day: 29 } }

export function isCalendarId(value: unknown): value is CalendarId {
  return typeof value === 'string' && value in CALENDARS
}

/** Day index <-> calendar date, anchored on day 0. Arithmetic is in UTC. */
export class DayClock {
  private readonly day0: number
  private readonly cache = new Map<CalendarId, boolean[]>()

  constructor(day0Iso: string) {
    this.day0 = Date.UTC(+day0Iso.slice(0, 4), +day0Iso.slice(5, 7) - 1, +day0Iso.slice(8, 10))
  }

  /** Day index of an ISO date. Dates before day 0 are negative. */
  index(iso: string): number {
    const t = Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10))
    return Math.round((t - this.day0) / 86_400_000)
  }

  iso(index: number): string {
    return new Date(this.day0 + index * 86_400_000).toISOString().slice(0, 10)
  }

  isWorking(cal: CalendarId, i: number): boolean {
    if (cal === 'seven_day') return true
    let days = this.cache.get(cal)
    if (!days) { days = []; this.cache.set(cal, days) }
    // Index can be negative for actuals entered before day 0; offset the cache.
    const k = i + 4000
    if (days[k] === undefined) days[k] = this.computeWorking(cal, i)
    return days[k]
  }

  private computeWorking(cal: CalendarId, i: number): boolean {
    const d = new Date(this.day0 + i * 86_400_000)
    if (cal === 'six_day') return d.getUTCDay() !== 0
    const m = d.getUTCMonth() + 1
    const day = d.getUTCDate()
    const { from, to } = WINTER_SHUTDOWN
    const afterFrom = m > from.month || (m === from.month && day >= from.day)
    const beforeTo = m < to.month || (m === to.month && day <= to.day)
    // The window wraps the year end, so it is "after from OR before to".
    return !(afterFrom || beforeTo)
  }

  /** First working day at or after i. */
  nextWorking(cal: CalendarId, i: number): number {
    let d = i
    for (let guard = 0; !this.isWorking(cal, d) && guard < 800; guard++) d++
    return d
  }

  /**
   * Exclusive end of `duration` working days starting on day `start`.
   * A zero duration is a milestone and ends where it starts.
   */
  add(cal: CalendarId, start: number, duration: number): number {
    if (duration <= 0) return start
    let d = start
    let done = 0
    while (done < duration) {
      if (this.isWorking(cal, d)) done++
      d++
    }
    return d
  }

  /** Latest start such that `duration` working days end by exclusive `end`. */
  subtract(cal: CalendarId, end: number, duration: number): number {
    if (duration <= 0) return end
    let d = end
    let done = 0
    while (done < duration) {
      d--
      if (this.isWorking(cal, d)) done++
    }
    return d
  }
}
