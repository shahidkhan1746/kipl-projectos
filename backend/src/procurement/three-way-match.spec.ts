import {
  matchStatus, needsAttention, receivedValueOf, orderedValueOf, MONEY_TOLERANCE,
} from './three-way-match'

const base = {
  orderedValue: 100000,
  receivedValue: 100000,
  billedAmount: 0,
  fullyReceived: true,
  anyReceived: true,
}

describe('matchStatus', () => {
  /**
   * The failure the report existed to prevent and could not reach: goods
   * mostly undelivered, value fully billed.
   */
  it('flags a PO billed in full against a tenth of its delivery', () => {
    expect(matchStatus({
      orderedValue: 100000,
      receivedValue: 10000,
      billedAmount: 100000,
      fullyReceived: false,
      anyReceived: true,
    })).toBe('BILLED_AHEAD_OF_RECEIPT')
  })

  it('flags billing against a PO where nothing has arrived at all', () => {
    expect(matchStatus({
      orderedValue: 100000,
      receivedValue: 0,
      billedAmount: 50000,
      fullyReceived: false,
      anyReceived: false,
    })).toBe('BILLED_AHEAD_OF_RECEIPT')
  })

  it('puts billing beyond the order itself above every other outcome', () => {
    expect(matchStatus({
      orderedValue: 100000,
      receivedValue: 20000,
      billedAmount: 150000,
      fullyReceived: false,
      anyReceived: true,
    })).toBe('EXCESS_BILLING')
  })

  // The precedence bug: these were checked after the delivery states, so an
  // incomplete delivery masked whatever was happening to the money.
  it('does not let an incomplete delivery hide over-billing', () => {
    const partialAndOverBilled = {
      orderedValue: 100000, receivedValue: 30000, billedAmount: 90000,
      fullyReceived: false, anyReceived: true,
    }
    expect(matchStatus(partialAndOverBilled)).not.toBe('PARTIALLY_DELIVERED')
  })

  describe('the ordinary states still behave', () => {
    it('is pending GRN before anything arrives', () => {
      expect(matchStatus({ ...base, receivedValue: 0, billedAmount: 0, fullyReceived: false, anyReceived: false }))
        .toBe('PENDING_GRN')
    })

    it('is partially delivered when some arrived and billing has not run ahead', () => {
      expect(matchStatus({ ...base, receivedValue: 40000, billedAmount: 30000, fullyReceived: false }))
        .toBe('PARTIALLY_DELIVERED')
    })

    it('is pending a requisition once received in full with nothing billed', () => {
      expect(matchStatus({ ...base, billedAmount: 0 })).toBe('PENDING_PAYMENT_REQUISITION')
    })

    it('is fully matched when received in full and billed within it', () => {
      expect(matchStatus({ ...base, billedAmount: 100000 })).toBe('FULLY_MATCHED')
    })
  })

  describe('rounding is not a discrepancy', () => {
    it('ignores a difference under a rupee', () => {
      expect(matchStatus({ ...base, billedAmount: 100000 + MONEY_TOLERANCE }))
        .toBe('FULLY_MATCHED')
    })

    it('reports a difference above it', () => {
      expect(matchStatus({ ...base, receivedValue: 50000, billedAmount: 50000 + MONEY_TOLERANCE + 0.01 }))
        .toBe('BILLED_AHEAD_OF_RECEIPT')
    })
  })

  it('marks only the money problems as needing attention', () => {
    expect(needsAttention('EXCESS_BILLING')).toBe(true)
    expect(needsAttention('BILLED_AHEAD_OF_RECEIPT')).toBe(true)
    expect(needsAttention('PARTIALLY_DELIVERED')).toBe(false)
    expect(needsAttention('PENDING_GRN')).toBe(false)
    expect(needsAttention('FULLY_MATCHED')).toBe(false)
  })
})

describe('receivedValueOf', () => {
  it('values what arrived at the rate it was ordered at', () => {
    expect(receivedValueOf([{ quantity: 100, receivedQty: 40, unitRate: 250 }])).toBe(10000)
  })

  it('sums across lines', () => {
    expect(receivedValueOf([
      { quantity: 100, receivedQty: 100, unitRate: 250 },
      { quantity: 50, receivedQty: 10, unitRate: 1000 },
    ])).toBe(35000)
  })

  // Otherwise a surplus delivery raises the received value and quietly makes
  // room to bill above the order without tripping anything.
  it('does not let an over-delivery raise the value beyond what was ordered', () => {
    expect(receivedValueOf([{ quantity: 100, receivedQty: 130, unitRate: 250 }])).toBe(25000)
  })

  it('is zero before anything arrives', () => {
    expect(receivedValueOf([{ quantity: 100, receivedQty: 0, unitRate: 250 }])).toBe(0)
    expect(receivedValueOf([])).toBe(0)
  })

  it('survives decimal strings, which is how the columns come back', () => {
    expect(receivedValueOf([{ quantity: '100.000', receivedQty: '40.000', unitRate: '250.00' }])).toBe(10000)
  })

  it('treats missing or unparseable figures as zero rather than NaN', () => {
    expect(receivedValueOf([{ quantity: 100, receivedQty: undefined, unitRate: 250 }])).toBe(0)
    expect(receivedValueOf([{ quantity: 100, receivedQty: Number('x'), unitRate: 250 }])).toBe(0)
  })
})

describe('orderedValueOf', () => {
  it('totals the line amounts', () => {
    expect(orderedValueOf([{ totalAmount: 25000 }, { totalAmount: 50000 }])).toBe(75000)
  })

  it('is zero for an order with no lines', () => {
    expect(orderedValueOf([])).toBe(0)
  })
})
