import { valueOf, rowValue } from './valuation'

const receipt = (qty: number, rate?: number, amount?: number) => ({
  receivedQty: qty, consumedQty: 0, rate: rate ?? null, amount: amount ?? null,
})
const issue = (qty: number) => ({ receivedQty: 0, consumedQty: qty, rate: null, amount: null })

describe('rowValue', () => {
  it('prefers the stored amount, which is the historical fact', () => {
    expect(rowValue(receipt(100, 250, 24000))).toBe(24000)
  })

  it('falls back to rate times quantity', () => {
    expect(rowValue(receipt(100, 250))).toBe(25000)
  })

  // A zero amount beside a real rate means the amount was never filled in,
  // not that the delivery was free. Column defaults make this the common case
  // for every row written before amounts existed.
  it('treats a zero amount as unset when a rate is present', () => {
    expect(rowValue(receipt(100, 250, 0))).toBe(25000)
  })

  it('is nothing when neither is recorded', () => {
    expect(rowValue(receipt(100))).toBeNull()
  })

  it('reads decimal strings, which is how the columns come back', () => {
    expect(rowValue({ receivedQty: '100.000', rate: '250.00', amount: null })).toBe(25000)
  })
})

describe('valueOf', () => {
  it('totals what was spent on receipts', () => {
    const v = valueOf([receipt(100, 250), receipt(50, 300)])
    expect(v.receivedValue).toBe(40000)
  })

  // A bag issued today was not necessarily bought at today's rate, and on a
  // three-year project it certainly was not.
  it('values consumption at the weighted average, not the latest rate', () => {
    const v = valueOf([receipt(100, 200), receipt(100, 400), issue(50)])
    expect(v.averageRate).toBe(300)
    expect(v.consumedValue).toBe(15000)
  })

  it('weights by quantity rather than treating each receipt equally', () => {
    // 900 at 100 and 100 at 500 averages 140, not 300.
    const v = valueOf([receipt(900, 100), receipt(100, 500)])
    expect(v.averageRate).toBe(140)
  })

  it('does not change with the order rows are entered in', () => {
    const rows = [receipt(100, 200), receipt(100, 400), issue(50)]
    expect(valueOf(rows).averageRate).toBe(valueOf([...rows].reverse()).averageRate)
  })

  it('values the stock left on hand', () => {
    const v = valueOf([receipt(100, 250), issue(40)])
    expect(v.stockValue).toBe(15000)
  })

  it('does not report a negative stock value when more left than arrived', () => {
    const v = valueOf([receipt(100, 250), issue(140)])
    expect(v.stockValue).toBe(0)
  })

  describe('when some deliveries have no rate', () => {
    it('averages over the quantity that has one', () => {
      const v = valueOf([receipt(100, 250), receipt(100)])
      expect(v.averageRate).toBe(250)
      expect(v.receivedValue).toBe(25000)
    })

    it('says what share of the quantity is priced', () => {
      const v = valueOf([receipt(100, 250), receipt(300)])
      expect(v.rateCoverage).toBe(0.25)
      expect(v.unvaluedQty).toBe(300)
    })

    it('reports full coverage when every delivery is priced', () => {
      expect(valueOf([receipt(100, 250), receipt(50, 300)]).rateCoverage).toBe(1)
    })
  })

  describe('when nothing can be valued', () => {
    // Zero would read as free material rather than as unpriced material.
    it('reports nothing rather than zero', () => {
      const v = valueOf([receipt(100), issue(20)])
      expect(v.averageRate).toBeNull()
      expect(v.consumedValue).toBeNull()
      expect(v.stockValue).toBeNull()
      expect(v.rateCoverage).toBe(0)
    })

    it('handles an empty register', () => {
      const v = valueOf([])
      expect(v.receivedValue).toBe(0)
      expect(v.averageRate).toBeNull()
      expect(v.rateCoverage).toBe(0)
    })

    it('handles consumption with no receipts at all', () => {
      const v = valueOf([issue(50)])
      expect(v.consumedValue).toBeNull()
    })
  })

  it('ignores unparseable figures rather than producing NaN', () => {
    const v = valueOf([
      { receivedQty: 100, rate: 250, amount: null },
      { receivedQty: Number('x'), rate: Number('y'), amount: null },
    ])
    expect(v.receivedValue).toBe(25000)
    expect(Number.isNaN(v.averageRate as number)).toBe(false)
  })
})
