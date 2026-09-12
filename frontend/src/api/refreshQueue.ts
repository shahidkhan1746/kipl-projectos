/**
 * Coordinates the one token refresh that many parallel 401s must share.
 *
 * A dashboard load fires a dozen requests at once. When the access token has
 * expired they all come back 401 together, and exactly one of them should go
 * and refresh while the rest wait for its outcome.
 *
 * The previous version of this got the waiting half right and the outcome half
 * wrong: on success it handed every waiter the new token, but on failure it
 * emptied the queue **without settling anybody**. Every waiter was left holding
 * a promise that would never resolve and never reject. TanStack Query reports
 * such a query as permanently loading — no data, no error — so the dashboard
 * rendered an em dash in every panel with nothing anywhere to say why, and no
 * amount of waiting would ever change it.
 *
 * The rule this type exists to enforce: a refresh round always ends, and it
 * ends for everyone in it.
 */

interface Waiter {
  resolve: (token: string) => void
  reject: (error: unknown) => void
}

export class RefreshCoordinator {
  private refreshing = false
  private waiters: Waiter[] = []

  /** True while a refresh is in flight. */
  get inFlight(): boolean {
    return this.refreshing
  }

  /** How many requests are parked on the current round. */
  get waiting(): number {
    return this.waiters.length
  }

  /**
   * Claims the right to perform the refresh. The first caller gets true and
   * must go on to call `succeed` or `fail`; everyone else gets false and should
   * `wait()` instead.
   */
  begin(): boolean {
    if (this.refreshing) return false
    this.refreshing = true
    return true
  }

  /** Parks a request until the in-flight round finishes, either way. */
  wait(): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      this.waiters.push({ resolve, reject })
    })
  }

  /** Ends the round: every waiter is handed the new token. */
  succeed(token: string): void {
    this.settle(waiter => waiter.resolve(token))
  }

  /** Ends the round: every waiter is rejected with the reason it failed. */
  fail(error: unknown): void {
    this.settle(waiter => waiter.reject(error))
  }

  /**
   * The list is taken and the flag cleared before anyone is handed their
   * outcome, so the round's state is already consistent for whatever runs next.
   * Promise callbacks are asynchronous, so with the current callers the two
   * orderings are indistinguishable — this is ordering discipline, not a
   * behaviour any test can pin down, and it is written that way so it stays
   * correct if a synchronous hand is ever passed in.
   */
  private settle(hand: (waiter: Waiter) => void): void {
    const round = this.waiters
    this.waiters = []
    this.refreshing = false
    for (const waiter of round) hand(waiter)
  }
}

/**
 * Endpoints that must never be retried by refreshing a token.
 *
 * Answering a 401 from `/auth/refresh` by calling `/auth/refresh` is circular:
 * the session hydrator refreshes through the same client, so an expired cookie
 * produced two identical refresh calls and two rounds of the same failure
 * before anyone gave up. Login and logout are here for the same reason — a 401
 * from them is the answer, not a stale token.
 */
const REFRESH_EXEMPT = ['/api/v1/auth/refresh', '/api/v1/auth/login', '/api/v1/auth/logout']

export function isRefreshExempt(url: string | undefined): boolean {
  if (!url) return false
  const path = url.split('?')[0]
  return REFRESH_EXEMPT.some(exempt => path.endsWith(exempt))
}
