/**
 * What the stock is worth, and what was spent on it.
 *
 * The register recorded quantities and nothing else, so procurement value could
 * not be answered from it. Rates now sit on receipt rows, which raises the
 * question of how to value what LEAVES: a bag of cement issued today was not
 * necessarily bought at today's rate, and on a three-year project it certainly
 * was not.
 *
 * Consumption is valued at the weighted average of what has been received.
 * It is the standard treatment for interchangeable materials, it does not
 * require tracking which physical delivery a given bag came from — which
 * nobody on a site does — and it cannot be gamed by the order rows happen to
 * be entered in, which picking the latest or the first rate both can.
 *
 * Where rates are missing the average is taken over the quantity that has one,
 * and the share that does is reported. A valuation built on a third of the
 * deliveries is not wrong so long as it says so; presented as complete, it is.
 */

export interface ValuedRow {
  receivedQty?: number | string | null
  consumedQty?: number | string | null
  rate?: number | string | null
  amount?: number | string | null
}

export interface Valuation {
  /** Total spent on receipts whose rate is known. */
  receivedValue: number
  /** Weighted average cost per unit across those receipts, or null when none. */
  averageRate: number | null
  /** Consumption at the weighted average. Null when nothing can be valued. */
  consumedValue: number | null
  /** Stock on hand at the weighted average. Null when nothing can be valued. */
  stockValue: number | null
  /**
   * The share of received quantity that carries a rate, 0 to 1. Below 1 the
   * figures above describe part of the picture, and the caller must say so.
   */
  rateCoverage: number
  /** Received quantity with no rate against it. */
  unvaluedQty: number
}

const n = (value: unknown): number => {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const round = (value: number, places = 2): number =>
  +(Math.round(value * 10 ** places) / 10 ** places).toFixed(places)

/** The value of one row: its stored amount, or its rate times its quantity. */
export function rowValue(row: ValuedRow): number | null {
  const amount = row.amount == null ? null : n(row.amount)
  if (amount !== null && amount !== 0) return amount
  const rate = row.rate == null ? null : n(row.rate)
  if (rate === null) return amount
  const qty = n(row.receivedQty)
  if (qty === 0) return amount
  return round(rate * qty)
}

export function valueOf(rows: ValuedRow[]): Valuation {
  let receivedValue = 0
  let valuedQty = 0
  let unvaluedQty = 0
  let receivedQty = 0
  let consumedQty = 0

  for (const row of rows) {
    const received = n(row.receivedQty)
    consumedQty += n(row.consumedQty)
    if (received <= 0) continue
    receivedQty += received

    const value = rowValue(row)
    if (value === null) {
      unvaluedQty += received
      continue
    }
    receivedValue += value
    valuedQty += received
  }

  const averageRate = valuedQty > 0 ? round(receivedValue / valuedQty, 4) : null

  return {
    receivedValue: round(receivedValue),
    averageRate,
    // Nothing valued means nothing to say. A zero here would read as free
    // material rather than as an unpriced one.
    consumedValue: averageRate === null ? null : round(consumedQty * averageRate),
    stockValue: averageRate === null
      ? null
      : round(Math.max(0, receivedQty - consumedQty) * averageRate),
    rateCoverage: receivedQty > 0 ? round(valuedQty / receivedQty, 4) : 0,
    unvaluedQty: round(unvaluedQty, 3),
  }
}
