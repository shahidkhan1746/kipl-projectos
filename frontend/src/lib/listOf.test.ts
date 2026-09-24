import { describe, it, expect } from 'vitest'
import { listOf, isListShaped } from './listOf'

describe('listOf', () => {
  it('passes a bare array through unchanged', () => {
    const rows = [{ id: 'a' }, { id: 'b' }]
    expect(listOf(rows)).toBe(rows)
  })

  it('unwraps the {items} shape that crashed the QA page', () => {
    const items = [{ id: 'cube-1' }]
    expect(listOf({ items, stats: { totalSets: 1 } })).toEqual(items)
  })

  it('unwraps the {items, unreadCount} shape the bell reads', () => {
    const items = [{ id: 'n1', isRead: false }]
    expect(listOf({ items, unreadCount: 1 })).toEqual(items)
  })

  it('unwraps the other wrapper keys this API uses', () => {
    expect(listOf({ files: [1] })).toEqual([1])
    expect(listOf({ records: [2] })).toEqual([2])
    expect(listOf({ data: [3] })).toEqual([3])
    expect(listOf({ rows: [4] })).toEqual([4])
    expect(listOf({ results: [5] })).toEqual([5])
    expect(listOf({ logs: [6] })).toEqual([6])
  })

  it('prefers items over a later key when a payload carries both', () => {
    // Ordering has to be decided rather than left to object key order, or the
    // same payload resolves differently depending on how it was serialised.
    expect(listOf({ data: ['wrong'], items: ['right'] })).toEqual(['right'])
  })

  it('returns empty for null, undefined and a missing field', () => {
    expect(listOf(null)).toEqual([])
    expect(listOf(undefined)).toEqual([])
    expect(listOf({})).toEqual([])
  })

  it('returns empty rather than throwing for a scalar', () => {
    // An error body or an HTML page reaching here must not take the page down.
    expect(listOf('Internal Server Error')).toEqual([])
    expect(listOf(42)).toEqual([])
    expect(listOf(true)).toEqual([])
  })

  it('ignores a wrapper key that is present but not an array', () => {
    // {items: null} is a real answer from a paginator with nothing to page.
    expect(listOf({ items: null })).toEqual([])
    expect(listOf({ items: 'none' })).toEqual([])
  })

  it('falls through a non-array wrapper key to a later one that is an array', () => {
    expect(listOf({ items: null, data: [7] })).toEqual([7])
  })

  it('does not treat a dashboard object as a list', () => {
    // qa/dashboard answers with counts. Coercing it to [] is right; finding a
    // list in it would be worse.
    expect(listOf({ totalInspections: 4, passed: 3, passRate: '75.0' })).toEqual([])
  })
})

describe('isListShaped', () => {
  it('separates an empty list from a payload that carried none', () => {
    expect(isListShaped([])).toBe(true)
    expect(isListShaped({ items: [] })).toBe(true)
    expect(isListShaped({ totalSets: 0 })).toBe(false)
    expect(isListShaped(null)).toBe(false)
  })

  it('agrees with listOf on every wrapper key', () => {
    for (const key of ['items', 'data', 'rows', 'records', 'results', 'files', 'logs']) {
      expect(isListShaped({ [key]: [1] })).toBe(true)
    }
  })
})
