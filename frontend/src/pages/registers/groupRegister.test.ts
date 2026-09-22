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

/**
 * The grouping must fold exactly what the server folds when it keys stock
 * (backend/src/material-register/material-key.ts). If they differ, the group
 * header and the stock summary describe different sets of rows.
 */
describe('groupByMaterial: agreeing with the server on what one material is', () => {
  it('folds case and spacing variants into one group', () => {
    const groups = groupByMaterial([
      { id: '1', material: 'Khak Bajri', receivedQty: 400, unit: 'cft' },
      { id: '2', material: 'Khak Bajri ', receivedQty: 400, unit: 'cft' },
      { id: '3', material: ' khak bajri', receivedQty: 400, unit: 'cft' },
      { id: '4', material: 'Khak   Bajri', receivedQty: 400, unit: 'cft' },
    ])
    expect(groups).toHaveLength(1)
    expect(groups[0].received).toBe(1600)
  })

  it('shows the name as first entered, trimmed', () => {
    const groups = groupByMaterial([{ id: '1', material: '  Khak   Bajri  ', receivedQty: 400 }])
    expect(groups[0].material).toBe('Khak Bajri')
  })

  it('keeps genuinely different materials apart', () => {
    const groups = groupByMaterial([
      { id: '1', material: 'Cement OPC 43', receivedQty: 100 },
      { id: '2', material: 'Cement OPC 53', receivedQty: 100 },
    ])
    expect(groups).toHaveLength(2)
  })

  it('collects every unit a material has been recorded in', () => {
    const groups = groupByMaterial([
      { id: '1', material: 'Khak Bajri', receivedQty: 400, unit: 'cft' },
      { id: '2', material: 'Khak Bajri', receivedQty: 400, unit: 'KG' },
      { id: '3', material: 'Khak Bajri', receivedQty: 400, unit: 'cft' },
    ])
    expect(groups[0].units).toEqual(['cft', 'KG'])
  })

  it('reports a single unit without fuss', () => {
    const groups = groupByMaterial([
      { id: '1', material: 'Khak Bajri', receivedQty: 400, unit: 'cft' },
      { id: '2', material: 'Khak Bajri', receivedQty: 600, unit: 'cft' },
    ])
    expect(groups[0].units).toEqual(['cft'])
  })

  it('ignores blank units rather than counting them as a second one', () => {
    const groups = groupByMaterial([
      { id: '1', material: 'Khak Bajri', receivedQty: 400, unit: 'cft' },
      { id: '2', material: 'Khak Bajri', receivedQty: 400, unit: '  ' },
      { id: '3', material: 'Khak Bajri', receivedQty: 400 },
    ])
    expect(groups[0].units).toEqual(['cft'])
  })
})

/**
 * The register had no cost in it at all, so "how much of each material have we
 * procured and at what value" could not be answered from it.
 */
describe('groupByMaterial: procurement value', () => {
  it('totals what the receipts cost', () => {
    const groups = groupByMaterial([
      { id: '1', material: 'Cement', receivedQty: 500, rate: 420, amount: 210000 },
      { id: '2', material: 'Cement', receivedQty: 300, rate: 440, amount: 132000 },
    ])
    expect(groups[0].procurementValue).toBe(342000)
  })

  it('falls back to rate times quantity when no amount was stored', () => {
    const groups = groupByMaterial([{ id: '1', material: 'Cement', receivedQty: 500, rate: 420 }])
    expect(groups[0].procurementValue).toBe(210000)
  })

  // A zero amount beside a real rate means the amount was never filled in, not
  // that the delivery was free.
  it('treats a stored zero amount as unset when a rate is present', () => {
    const groups = groupByMaterial([{ id: '1', material: 'Cement', receivedQty: 500, rate: 420, amount: 0 }])
    expect(groups[0].procurementValue).toBe(210000)
  })

  // Counting it as zero would make a partly-priced material look cheap rather
  // than partly unrecorded.
  it('counts quantity with no rate as unpriced rather than as free', () => {
    const groups = groupByMaterial([
      { id: '1', material: 'Khak Bajri', receivedQty: 400, rate: 25 },
      { id: '2', material: 'Khak Bajri', receivedQty: 600 },
    ])
    expect(groups[0].procurementValue).toBe(10000)
    expect(groups[0].unpricedQty).toBe(600)
  })

  it('leaves consumption out of procurement value', () => {
    const groups = groupByMaterial([
      { id: '1', material: 'Cement', receivedQty: 500, rate: 420 },
      { id: '2', material: 'Cement', consumedQty: 200, rate: 420 },
    ])
    expect(groups[0].procurementValue).toBe(210000)
    expect(groups[0].unpricedQty).toBe(0)
  })

  it('is zero for a material with no rates at all', () => {
    const groups = groupByMaterial([{ id: '1', material: 'Khak Bajri', receivedQty: 4200 }])
    expect(groups[0].procurementValue).toBe(0)
    expect(groups[0].unpricedQty).toBe(4200)
  })

  describe('daysOfCover', () => {
    it('calculates days of cover based on trailing 7-day consumption', () => {
      const today = new Date().toISOString().split('T')[0]
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      // Received 1000 kg, consumed 350 kg in last 7 days -> burn = 50 kg/day. Balance = 650 kg. Days = 650 / 50 = 13d (moderate)
      const groups = groupByMaterial([
        { id: '1', material: 'TMT SAIL BARS 16MM', date: twoDaysAgo, receivedQty: 1000, unit: 'KG' },
        { id: '2', material: 'TMT SAIL BARS 16MM', date: today, consumedQty: 350, unit: 'KG' },
      ])
      expect(groups[0].daysOfCover).toBeDefined()
      expect(groups[0].daysOfCover.dailyBurn).toBe(50)
      expect(groups[0].daysOfCover.burnWindowDays).toBe(7)
      expect(groups[0].daysOfCover.days).toBe(13)
      expect(groups[0].daysOfCover.status).toBe('moderate')
    })

    it('flags critical reorder when stock cover is 4 days or less', () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      // Received 600 kg, consumed 420 kg in last 7 days -> daily burn = 60 kg/day. Balance = 180 kg -> days = 180 / 60 = 3 days!
      const groups = groupByMaterial([
        { id: '1', material: 'TMT SAIL BARS 16MM', date: yesterday, receivedQty: 600, unit: 'KG' },
        { id: '2', material: 'TMT SAIL BARS 16MM', date: yesterday, consumedQty: 420, unit: 'KG' },
      ])
      expect(groups[0].daysOfCover.status).toBe('critical')
      expect(groups[0].daysOfCover.days).toBe(3)
      expect(groups[0].daysOfCover.label).toContain('⚠️ Reorder: 3d cover')
    })

    it('returns dormant when no consumption has occurred', () => {
      const groups = groupByMaterial([{ id: '1', material: 'Bricks', receivedQty: 5000, unit: 'Nos' }])
      expect(groups[0].daysOfCover.status).toBe('dormant')
      expect(groups[0].daysOfCover.days).toBeNull()
    })
  })
})
