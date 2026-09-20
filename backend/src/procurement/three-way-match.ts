/**
 * Reconciling a purchase order against what arrived and what was billed.
 *
 * The report this replaces never compared billing to RECEIPT. It checked the
 * billed amount against the ORDERED value, and only on a fully delivered order:
 *
 *   if (receivedQty === 0)             PENDING_GRN
 *   else if (receivedQty < orderedQty) PARTIALLY_DELIVERED   <- returned here
 *   else if (billedAmount === 0)       PENDING_PAYMENT_REQUISITION
 *   else if (billed > totalOrdered)    EXCESS_BILLING
 *
 * So a PO with 10% of its goods delivered and 100% of its value billed reported
 * PARTIALLY_DELIVERED, and paying for goods that never arrived — the single
 * thing a three-way match exists to catch — could not be reached at all.
 *
 * Billing ahead of receipt is now its own outcome, checked before the delivery
 * states. It is named for what it is rather than as an accusation: an advance
 * against an order is legitimate, and the report's job is to put the two
 * figures in front of someone, not to decide which case it is.
 */

export type MatchStatus =
  /** Billed beyond the value of the order itself. */
  | 'EXCESS_BILLING'
  /** Billed beyond the value of what has actually been received. */
  | 'BILLED_AHEAD_OF_RECEIPT'
  /** Nothing received yet, and nothing billed. */
  | 'PENDING_GRN'
  /** Some goods received, order not complete. */
  | 'PARTIALLY_DELIVERED'
  /** Fully received, nothing billed yet. */
  | 'PENDING_PAYMENT_REQUISITION'
  | 'FULLY_MATCHED'

export interface MatchInput {
  /** Value of the order as placed. */
  orderedValue: number
  /** Value of what has arrived: received quantity at the ordered rate. */
  receivedValue: number
  /** Total billed against this order in payment requisitions. */
  billedAmount: number
  /** True when every line has been received in full. */
  fullyReceived: boolean
  /** True when anything at all has been received. */
  anyReceived: boolean
}

/**
 * Rounding on two-decimal money columns means exact comparison reports
 * differences nobody would call a difference. A rupee is below the threshold of
 * anything worth a person's attention on an order worth lakhs.
 */
export const MONEY_TOLERANCE = 1

export function matchStatus(input: MatchInput): MatchStatus {
  const { orderedValue, receivedValue, billedAmount, fullyReceived, anyReceived } = input

  // Worst first. Ordering matters: these used to be checked after the delivery
  // states, which is what made over-billing on an incomplete order invisible.
  if (billedAmount > orderedValue + MONEY_TOLERANCE) return 'EXCESS_BILLING'
  if (billedAmount > receivedValue + MONEY_TOLERANCE) return 'BILLED_AHEAD_OF_RECEIPT'

  if (!anyReceived) return 'PENDING_GRN'
  if (!fullyReceived) return 'PARTIALLY_DELIVERED'
  if (billedAmount <= MONEY_TOLERANCE) return 'PENDING_PAYMENT_REQUISITION'
  return 'FULLY_MATCHED'
}

/** Statuses that need a person to look at them. */
export function needsAttention(status: MatchStatus): boolean {
  return status === 'EXCESS_BILLING' || status === 'BILLED_AHEAD_OF_RECEIPT'
}

export interface LineInput {
  quantity?: number | string
  receivedQty?: number | string
  unitRate?: number | string
  totalAmount?: number | string
}

const money = (value: unknown): number => {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : 0
}

/**
 * The value of what has actually arrived, at the rate it was ordered at.
 *
 * Capped at the ordered quantity per line. Over-delivery is a separate question
 * from over-billing, and letting a surplus delivery raise the received value
 * would quietly create room to bill above the order without tripping anything.
 */
export function receivedValueOf(lines: LineInput[]): number {
  let total = 0
  for (const line of lines) {
    const ordered = money(line.quantity)
    const received = Math.min(money(line.receivedQty), ordered)
    const rate = money(line.unitRate)
    total += received * rate
  }
  return +total.toFixed(2)
}

/** The value of the order as placed. */
export function orderedValueOf(lines: LineInput[]): number {
  return +lines.reduce((sum, line) => sum + money(line.totalAmount), 0).toFixed(2)
}
