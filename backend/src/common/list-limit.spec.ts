import { resolveListLimit, DEFAULT_LIST_LIMIT, MAX_LIST_LIMIT } from './list-limit'

/**
 * Every list endpoint was unbounded before this. The cap is what stops a
 * 30-month site diary being served in full to a phone, so its edges matter:
 * a missing or hostile value must fall back to the default, never to "all".
 */
describe('resolveListLimit', () => {
  it('defaults when no limit is supplied', () => {
    expect(resolveListLimit(undefined)).toBe(DEFAULT_LIST_LIMIT)
    expect(resolveListLimit(null)).toBe(DEFAULT_LIST_LIMIT)
    expect(resolveListLimit('')).toBe(DEFAULT_LIST_LIMIT)
  })

  it('accepts a caller-supplied limit within range', () => {
    expect(resolveListLimit(50)).toBe(50)
    expect(resolveListLimit('50')).toBe(50)
  })

  it('clamps an oversized request to the ceiling', () => {
    expect(resolveListLimit(999999)).toBe(MAX_LIST_LIMIT)
    expect(resolveListLimit('999999')).toBe(MAX_LIST_LIMIT)
  })

  it('falls back to the default on junk rather than returning everything', () => {
    // A query string is attacker-controlled; none of these may disable the cap.
    expect(resolveListLimit('abc')).toBe(DEFAULT_LIST_LIMIT)
    expect(resolveListLimit('0')).toBe(DEFAULT_LIST_LIMIT)
    expect(resolveListLimit('-1')).toBe(DEFAULT_LIST_LIMIT)
    expect(resolveListLimit(Number.NaN)).toBe(DEFAULT_LIST_LIMIT)
    expect(resolveListLimit(Number.POSITIVE_INFINITY)).toBe(DEFAULT_LIST_LIMIT)
  })

  it('truncates a fractional limit', () => {
    expect(resolveListLimit(10.9)).toBe(10)
  })
})
