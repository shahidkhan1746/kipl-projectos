import { describe, it, expect, vi } from 'vitest'
import { RefreshCoordinator, isRefreshExempt } from './refreshQueue'

const settled = <T,>(p: Promise<T>) =>
  p.then(value => ({ state: 'resolved' as const, value }),
         reason => ({ state: 'rejected' as const, reason }))

/** Nothing is settled synchronously; give the microtask queue a turn. */
const tick = () => new Promise<void>(resolve => setTimeout(resolve, 0))

describe('RefreshCoordinator', () => {
  it('lets exactly one caller perform the refresh', () => {
    const c = new RefreshCoordinator()
    expect(c.begin()).toBe(true)
    expect(c.begin()).toBe(false)
    expect(c.begin()).toBe(false)
  })

  it('reports a round in flight until it ends', () => {
    const c = new RefreshCoordinator()
    expect(c.inFlight).toBe(false)
    c.begin()
    expect(c.inFlight).toBe(true)
    c.succeed('t')
    expect(c.inFlight).toBe(false)
  })

  it('hands the new token to every parked request', async () => {
    const c = new RefreshCoordinator()
    c.begin()
    const parked = [c.wait(), c.wait(), c.wait()]
    expect(c.waiting).toBe(3)
    c.succeed('fresh-token')
    expect(await Promise.all(parked)).toEqual(['fresh-token', 'fresh-token', 'fresh-token'])
  })

  it('rejects every parked request when the refresh fails', async () => {
    const c = new RefreshCoordinator()
    c.begin()
    const parked = [c.wait(), c.wait()]
    const outcomes = parked.map(settled)
    const boom = new Error('refresh failed')
    c.fail(boom)
    expect(await Promise.all(outcomes)).toEqual([
      { state: 'rejected', reason: boom },
      { state: 'rejected', reason: boom },
    ])
  })

  // The regression this class exists for. A dropped queue leaves promises that
  // never settle, which surfaces as a dashboard stuck on "loading" forever.
  it('leaves nothing unsettled after a failed round', async () => {
    const c = new RefreshCoordinator()
    c.begin()
    const outcome = settled(c.wait())
    const unsettled = Symbol('still pending')
    c.fail(new Error('nope'))
    await tick()
    const race = await Promise.race([outcome, Promise.resolve(unsettled)])
    expect(race).not.toBe(unsettled)
  })

  it('empties the queue so a waiter is never settled twice', async () => {
    const c = new RefreshCoordinator()
    c.begin()
    const resolved = vi.fn()
    const rejected = vi.fn()
    c.wait().then(resolved, rejected)
    c.fail(new Error('first'))
    await tick()
    c.succeed('late token')
    await tick()
    expect(rejected).toHaveBeenCalledTimes(1)
    expect(resolved).not.toHaveBeenCalled()
    expect(c.waiting).toBe(0)
  })

  it('is claimable again once a round ends, either way', () => {
    const c = new RefreshCoordinator()
    c.begin()
    c.fail(new Error('x'))
    expect(c.begin()).toBe(true)
    c.succeed('t')
    expect(c.begin()).toBe(true)
  })

  // A rejected waiter commonly reacts by retrying, which starts a new round.
  // By the time it runs, the failed round must be fully closed: claimable, and
  // with nobody left parked on it.
  it('leaves a closed, empty round behind for a waiter that retries', async () => {
    const c = new RefreshCoordinator()
    c.begin()
    let claimedDuringSettle: boolean | null = null
    let queueSeen: number | null = null
    c.wait().catch(() => {
      claimedDuringSettle = c.begin()
      queueSeen = c.waiting
    })
    c.fail(new Error('x'))
    await tick()
    expect(claimedDuringSettle).toBe(true)
    expect(queueSeen).toBe(0)
  })

  it('counts only the requests parked on the current round', async () => {
    const c = new RefreshCoordinator()
    c.begin()
    void settled(c.wait())
    void settled(c.wait())
    expect(c.waiting).toBe(2)
    c.succeed('t')
    expect(c.waiting).toBe(0)
    c.begin()
    void settled(c.wait())
    expect(c.waiting).toBe(1)
    c.fail(new Error('x'))
    await tick()
  })
})

describe('isRefreshExempt', () => {
  it('exempts the refresh endpoint, which cannot be fixed by refreshing', () => {
    expect(isRefreshExempt('/api/v1/auth/refresh')).toBe(true)
  })

  it('exempts login and logout', () => {
    expect(isRefreshExempt('/api/v1/auth/login')).toBe(true)
    expect(isRefreshExempt('/api/v1/auth/logout')).toBe(true)
  })

  it('exempts them behind an absolute base too', () => {
    expect(isRefreshExempt('https://kipl-projectos.onrender.com/api/v1/auth/refresh')).toBe(true)
  })

  it('ignores a query string when matching', () => {
    expect(isRefreshExempt('/api/v1/auth/refresh?x=1')).toBe(true)
  })

  it('leaves every other endpoint refreshable', () => {
    expect(isRefreshExempt('/api/v1/wbs/dashboard')).toBe(false)
    expect(isRefreshExempt('/api/v1/auth/me')).toBe(false)
    expect(isRefreshExempt('/api/v1/auth/change-password')).toBe(false)
    expect(isRefreshExempt(undefined)).toBe(false)
  })

  it('does not match a path that merely contains the name', () => {
    expect(isRefreshExempt('/api/v1/auth/refresh/extra')).toBe(false)
  })
})
