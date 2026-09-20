import { describe, it, expect } from 'vitest'
import { groupByMaterial, stockState, type RegisterRow } from './groupRegister'

// Shaped on the real register: one steel delivery and a day of tipper loads.
const rows: RegisterRow[] = [
  { id: '1', material: 'TMT SAIL BARS 8MM', date: '2026-09-15', receivedQty: 8015, balance: 13145, unit: 'KG', contractorRep: 'Gowhar Shah' },
  { id: '2', material: 'TMT SAIL BARS 16MM', date: '2026-09-15', receivedQty: 22045, balance: 35020, unit: 'KG' },
  { id: '3', material: 'TMT SAIL BARS 8MM', date: '2026-08-12', receivedQty: 5130, balance: 5130, unit: 'KG' },
  { id: '4', material: 'TMT SAIL BARS 16MM', date: '2026-08-12', receivedQty: 12975, balance: 12975, unit: 'KG' },
  { id: '5', material: 'Khak Bajri', date: '2025-12-26', receivedQty: 400, balance: 4200, unit: 'cft' },
  { id: '6', material: 'Khak Bajri', date: '2025-12-26', receivedQty: 600, balance: 3800, unit: 'cft' },
]

describe('groupByMaterial', () => {
  it('collapses repeated rows into one group per material', () => {
    const groups = groupByMaterial(rows)
    expect(groups.map(g => g.material))
      .toEqual(['TMT SAIL BARS 8MM', 'TMT SAIL BARS 16MM', 'Khak Bajri'])
  })

  it('keeps the order materials first appear in', () => {
    const groups = groupByMaterial([...rows].reverse())
    expect(groups[0].material).toBe('Khak Bajri')
  })

  it('keeps every row, in the order it arrived', () => {
    const groups = groupByMaterial(rows)
    expect(groups.flatMap(g => g.rows.map(r => r.id)).sort()).toEqual(['1', '2', '3', '4', '5', '6'])
    expect(groups[0].rows.map(r => r.id)).toEqual(['1', '3'])
  })

  it('totals receipts across the group', () => {
    const steel = groupByMaterial(rows).find(g => g.material === 'TMT SAIL BARS 8MM')!
    expect(steel.received).toBe(13145)
    expect(steel.balance).toBe(13145)
  })

  // The balance must be received minus consumed, not the running balance of
  // whichever row sorts first — under a filter that is the wrong row, and a
  // header total that contradicts its own column is worse than none.
  it('derives the balance from the rows rather than trusting the first one', () => {
    const partial = groupByMaterial([rows[2]]) // the older 8MM row, balance 5130
    expect(partial[0].balance).toBe(5130)
    const both = groupByMaterial([rows[0], rows[2]])
    expect(both[0].balance).toBe(13145)
  })

  it('nets consumption off the balance', () => {
    const groups = groupByMaterial([
      { id: 'a', material: 'Cement OPC 53', receivedQty: 500, unit: 'Bags' },
      { id: 'b', material: 'Cement OPC 53', consumedQty: 120, unit: 'Bags' },
    ])
    expect(groups[0].received).toBe(500)
    expect(groups[0].consumed).toBe(120)
    expect(groups[0].balance).toBe(380)
    expect(groups[0].hasConsumption).toBe(true)
  })

  it('knows when nothing has been consumed, so the column can be dropped', () => {
    expect(groupByMaterial(rows).every(g => g.hasConsumption)).toBe(false)
    expect(groupByMaterial(rows)[0].consumed).toBe(0)
  })

  it('reports the most recent date in the group', () => {
    const steel = groupByMaterial(rows).find(g => g.material === 'TMT SAIL BARS 8MM')!
    expect(steel.lastActivity).toBe('2026-09-15')
  })

  it('takes the unit from the first row that has one', () => {
    const groups = groupByMaterial([
      { id: 'a', material: 'Khak Bajri', receivedQty: 400 },
      { id: 'b', material: 'Khak Bajri', receivedQty: 400, unit: 'cft' },
    ])
    expect(groups[0].unit).toBe('cft')
  })

  // Units disagreeing within one material means the data is wrong, not that
  // the last row is right. The header must at least be stable while it is
  // being corrected, rather than changing with row order.
  it('keeps the first unit when later rows disagree', () => {
    const groups = groupByMaterial([
      { id: 'a', material: 'Khak Bajri', receivedQty: 400, unit: 'cft' },
      { id: 'b', material: 'Khak Bajri', receivedQty: 400, unit: 'KG' },
    ])
    expect(groups[0].unit).toBe('cft')
  })

  it('survives rows with missing or unparseable quantities', () => {
    const groups = groupByMaterial([
      { id: 'a', material: 'X' },
      { id: 'b', material: 'X', receivedQty: undefined, consumedQty: Number('oops') },
      { id: 'c', material: 'X', receivedQty: 100 },
    ])
    expect(groups[0].received).toBe(100)
    expect(groups[0].consumed).toBe(0)
    expect(groups[0].balance).toBe(100)
  })

  it('does not accumulate floating point noise into the balance', () => {
    const groups = groupByMaterial([
      { id: 'a', material: 'Admixture', receivedQty: 0.1 },
      { id: 'b', material: 'Admixture', receivedQty: 0.2 },
    ])
    expect(groups[0].balance).toBe(0.3)
  })

  it('is empty for an empty register', () => {
    expect(groupByMaterial([])).toEqual([])
  })
})

describe('stockState', () => {
  it('separates the three states a balance can be in', () => {
    expect(stockState(4200)).toBe('in_stock')
    expect(stockState(0)).toBe('empty')
    expect(stockState(-50)).toBe('negative')
  })
})
