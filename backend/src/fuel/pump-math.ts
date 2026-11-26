/**
 * The pump account: money paid to the filling station, diesel taken from it,
 * and what is left of the advance. Pure functions, so the arithmetic is
 * tested without a database.
 *
 * Diesel taken comes from two places. Purchases in the stock register that
 * name the supplier, valued at their bill amount. And "lifts": fuel taken
 * from the supplier that never entered the stock register, such as the
 * deliveries before the register began. Both reduce the advance; only
 * purchases add to the stock.
 */

const round = (v: number, places = 2) => Math.round(v * 10 ** places) / 10 ** places

export interface PumpSupplierInput { id: string; name: string; rate: number | null }

export interface PumpEntryInput {
  id: string; entryType: 'payment' | 'lift'; date: string; createdAt: Date | string
  amount: number; litres: number | null; rate: number | null
  mode: string | null; reference: string | null; remarks: string | null; recordedByName: string | null
}

export interface PumpPurchaseInput {
  id: string; date: string; createdAt: Date | string
  litres: number; rate: number | null; amount: number | null; billNo: string | null; remarks: string | null
}

export interface PumpLine {
  id: string
  /** payment: money in. lift: diesel taken outside the stock register. purchase: a register purchase paid from the advance. */
  kind: 'payment' | 'lift' | 'purchase'
  date: string
  /** Rupees paid in (payments) or taken out (lifts, purchases). Always positive. */
  amount: number
  /** True when the purchase had no bill amount and was valued at the supplier's rate. */
  estimated: boolean
  litres: number | null
  rate: number | null
  mode: string | null
  reference: string | null
  remarks: string | null
  recordedByName: string | null
  /** The advance left after this line. Negative means the pump is giving credit. */
  balance: number
}

export interface PumpAccount {
  supplier: PumpSupplierInput
  paid: number
  taken: number
  litresTaken: number
  balance: number
  /** Litres the advance still buys at the current rate. */
  balanceLitres: number | null
  /** Days those litres last at the recent rate of issue. */
  daysCovered: number | null
  /** overdrawn: more taken than paid. low: the advance covers under LOW_ADVANCE_DAYS of diesel. */
  warning: 'overdrawn' | 'low' | null
  lastPayment: { date: string; amount: number; mode: string | null; reference: string | null } | null
  lines: PumpLine[]
}

/** The advance should cover at least a week of diesel. */
export const LOW_ADVANCE_DAYS = 7

const at = (d: Date | string) => (d instanceof Date ? d.getTime() : new Date(d).getTime())

export function pumpAccount(
  supplier: PumpSupplierInput,
  entries: PumpEntryInput[],
  purchases: PumpPurchaseInput[],
  dailyAverage: number | null,
): PumpAccount {
  const lines: (Omit<PumpLine, 'balance'> & { at: number })[] = [
    ...entries.map(e => ({
      id: e.id, kind: e.entryType, date: e.date, at: at(e.createdAt), amount: Number(e.amount), estimated: false,
      litres: e.litres === null ? null : Number(e.litres), rate: e.rate === null ? null : Number(e.rate),
      mode: e.mode, reference: e.reference, remarks: e.remarks, recordedByName: e.recordedByName,
    })),
    ...purchases.map(p => {
      const billed = p.amount ?? (p.rate !== null ? p.litres * p.rate : null)
      const amount = billed ?? (supplier.rate !== null ? p.litres * supplier.rate : 0)
      return {
        id: p.id, kind: 'purchase' as const, date: p.date, at: at(p.createdAt), amount: round(amount), estimated: billed === null,
        litres: p.litres, rate: p.rate ?? (billed === null ? supplier.rate : null),
        mode: null, reference: p.billNo, remarks: p.remarks, recordedByName: null,
      }
    }),
  ].sort((a, b) => a.date.localeCompare(b.date) || a.at - b.at)

  let balance = 0, paid = 0, taken = 0, litresTaken = 0
  const out: PumpLine[] = lines.map(({ at: _at, ...l }) => {
    if (l.kind === 'payment') { paid += l.amount; balance += l.amount } else { taken += l.amount; balance -= l.amount; litresTaken += l.litres ?? 0 }
    return { ...l, balance: round(balance) }
  })

  const balanceLitres = supplier.rate ? Math.floor(Math.max(0, balance) / supplier.rate) : null
  const daysCovered = balanceLitres !== null && dailyAverage ? round(balanceLitres / dailyAverage, 1) : null
  const warning = balance < 0 ? 'overdrawn' : daysCovered !== null && daysCovered < LOW_ADVANCE_DAYS ? 'low' : null
  const payments = out.filter(l => l.kind === 'payment')
  const last = payments[payments.length - 1]
  return {
    supplier, paid: round(paid), taken: round(taken), litresTaken: round(litresTaken), balance: round(balance),
    balanceLitres, daysCovered, warning,
    lastPayment: last ? { date: last.date, amount: last.amount, mode: last.mode, reference: last.reference } : null,
    lines: out,
  }
}
