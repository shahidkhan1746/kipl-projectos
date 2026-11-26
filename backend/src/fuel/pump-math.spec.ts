import { pumpAccount, PumpEntryInput, PumpPurchaseInput } from './pump-math'

const HFS = { id: 'hfs', name: 'Hazratbal Filling Station', rate: 96.42 }
let seq = 0
const t = (date: string) => new Date(`${date}T06:00:00Z`).getTime() + ++seq * 1000
const pay = (date: string, amount: number, reference: string | null = null, mode: string | null = null): PumpEntryInput =>
  ({ id: `p${seq}`, entryType: 'payment', date, createdAt: new Date(t(date)), amount, litres: null, rate: null, mode, reference, remarks: null, recordedByName: null })
const lift = (date: string, litres: number, reference: string | null = null): PumpEntryInput =>
  ({ id: `l${seq}`, entryType: 'lift', date, createdAt: new Date(t(date)), amount: Math.round(litres * 96.42 * 100) / 100, litres, rate: 96.42, mode: null, reference, remarks: null, recordedByName: null })
const buy = (date: string, litres: number, over: Partial<PumpPurchaseInput> = {}): PumpPurchaseInput =>
  ({ id: `b${seq}`, date, createdAt: new Date(t(date)), litres, rate: 96.42, amount: Math.round(litres * 96.42 * 100) / 100, billNo: null, remarks: null, ...over })

describe('pump account', () => {
  /** The Hazratbal Filling Station sheet, 19 Oct to 25 Nov 2026, in the order it was written. */
  function sheet() {
    seq = 0
    const entries = [
      pay('2026-10-19', 100000, '000081'),
      lift('2026-10-19', 200, '4693'), lift('2026-10-23', 200, '4725'), lift('2026-10-28', 200, '4735'), lift('2026-10-31', 200, '4753'),
      lift('2026-11-04', 200, '4778'), lift('2026-11-11', 200, '4775'), lift('2026-11-11', 50, '4776'),
      pay('2026-11-17', 100000), lift('2026-11-17', 200, '4637'),
    ]
    // From 20 Nov the deliveries are purchases in the stock register.
    const purchases = [buy('2026-11-20', 400), buy('2026-11-22', 600, { billNo: '4649' })]
    entries.push(pay('2026-11-25', 36229, '000091'))
    purchases.push(buy('2026-11-25', 600, { billNo: '4782' }))
    entries.push(pay('2026-11-25', 500000, '814629437', 'NEFT'))
    return { entries, purchases }
  }

  it('comes to the sheet\'s balance: 7,36,229 paid, 3,050 L taken, 4,42,148 left', () => {
    const { entries, purchases } = sheet()
    const a = pumpAccount(HFS, entries, purchases, 144)
    expect(a).toMatchObject({ paid: 736229, taken: 294081, litresTaken: 3050, balance: 442148 })
    // 4,42,148 buys 4,585 L at 96.42, about 31.8 days at 144 L a day.
    expect(a.balanceLitres).toBe(4585)
    expect(a.daysCovered).toBe(31.8)
    expect(a.warning).toBeNull()
    expect(a.lastPayment).toEqual({ date: '2026-11-25', amount: 500000, mode: 'NEFT', reference: '814629437' })
  })

  it('runs the balance line by line, and shows when the pump gave credit', () => {
    const { entries, purchases } = sheet()
    const lines = pumpAccount(HFS, entries, purchases, 144).lines
    const after = (kind: string, date: string, amount: number) => lines.find(l => l.kind === kind && l.date === date && l.amount === amount)!.balance
    // Diesel taken ran 36,229 past the advances by 22 Nov; the 25 Nov payment cleared it to nothing.
    expect(after('purchase', '2026-11-22', 57852)).toBe(-36229)
    expect(after('payment', '2026-11-25', 36229)).toBe(0)
    expect(after('purchase', '2026-11-25', 57852)).toBe(-57852)
    expect(lines[lines.length - 1]).toMatchObject({ kind: 'payment', amount: 500000, balance: 442148 })
  })

  it('values a purchase with no bill amount at the supplier rate, and says so', () => {
    seq = 0
    const a = pumpAccount(HFS, [pay('2026-11-01', 50000)], [buy('2026-11-02', 100, { rate: null, amount: null })], null)
    expect(a.lines[1]).toMatchObject({ amount: 9642, estimated: true, rate: 96.42 })
    expect(a.balance).toBe(40358)
    expect(a.daysCovered).toBeNull()
  })

  it('warns when more is taken than paid, or when the advance covers under a week', () => {
    seq = 0
    expect(pumpAccount(HFS, [pay('2026-11-01', 10000)], [buy('2026-11-02', 200)], 144).warning).toBe('overdrawn')
    seq = 0
    // 50,000 buys 518 L: 3.6 days at 144 L a day.
    const low = pumpAccount(HFS, [pay('2026-11-01', 50000)], [], 144)
    expect([low.balanceLitres, low.daysCovered, low.warning]).toEqual([518, 3.6, 'low'])
    expect(pumpAccount({ ...HFS, rate: null }, [pay('2026-11-01', 50000)], [], 144)).toMatchObject({ balanceLitres: null, daysCovered: null, warning: null })
  })
})
