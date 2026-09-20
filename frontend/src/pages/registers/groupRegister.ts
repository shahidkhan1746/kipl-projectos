/**
 * Groups the register by material.
 *
 * The flat ledger is correct and hard to read. Every row repeats the material
 * name, the category chip, the contractor rep and the client rep, so a delivery
 * of nine tipper loads on one day fills the screen with nine near-identical
 * lines and the eye has nothing to catch on.
 *
 * Worse, `balance` is a RUNNING balance per material, but the rows are ordered
 * by date across all materials — so two adjacent rows show the balances of two
 * different materials. Reading down the column means reading a sequence that
 * was never a sequence. Grouping restores it: within a material the balance
 * column is a ledger again.
 */

export interface RegisterRow {
  id: string
  material: string
  date?: string
  receivedQty?: number
  consumedQty?: number
  balance?: number
  unit?: string
  rate?: number | string | null
  amount?: number | string | null
  purpose?: string | null
  wbsCode?: string | null
  supplierName?: string | null
  contractorRep?: string
  ueedRep?: string
  remarks?: string
}

export interface MaterialGroup {
  material: string
  unit: string
  /** Rows for this material, newest first, as they arrived. */
  rows: RegisterRow[]
  received: number
  consumed: number
  /** Running balance of the most recent row, which is the current stock. */
  balance: number
  /** Whether any row records consumption — the column is hidden when none do. */
  hasConsumption: boolean
  /**
   * Every distinct unit the material has been recorded in. More than one means
   * the totals are a sum of different things — cubic feet added to kilograms —
   * so the figure is shown as disputed rather than as stock.
   */
  units: string[]
  /** Most recent date recorded against this material, or '' when none is. */
  lastActivity: string
  /** Total spent on receipts of this material whose rate is recorded. */
  procurementValue: number
  /** Received quantity carrying no rate — the value above covers only the rest. */
  unpricedQty: number
}

/**
 * The same folding the server applies when it keys stock
 * (backend/src/material-register/material-key.ts). If the two disagree, the
 * group header and the stock summary describe different sets of rows — which
 * is the defect this grouping was introduced to remove, reappearing one layer
 * up.
 */
export function materialKey(raw: unknown): string {
  return String(raw ?? '').trim().replace(/\s+/g, ' ').toLowerCase()
}

const qty = (value: unknown): number => {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : 0
}

/**
 * Preserves the order materials first appear in, so the grouping does not
 * silently reorder a list the caller has already sorted.
 */
export function groupByMaterial(rows: RegisterRow[]): MaterialGroup[] {
  const groups = new Map<string, MaterialGroup>()

  for (const row of rows) {
    const material = String(row.material ?? '').trim().replace(/\s+/g, ' ')
    const key = materialKey(material)
    let group = groups.get(key)
    if (!group) {
      group = {
        material,
        unit: row.unit ?? '',
        rows: [],
        received: 0,
        consumed: 0,
        balance: 0,
        hasConsumption: false,
        units: [],
        lastActivity: '',
        procurementValue: 0,
        unpricedQty: 0,
      }
      groups.set(key, group)
    }

    group.rows.push(row)
    group.received += qty(row.receivedQty)
    group.consumed += qty(row.consumedQty)
    if (qty(row.consumedQty) > 0) group.hasConsumption = true

    // Value follows the same rule the server uses: the stored amount is the
    // historical fact, rate times quantity is the fallback, and quantity with
    // neither is counted as unpriced rather than as free.
    const received = qty(row.receivedQty)
    if (received > 0) {
      const stored = row.amount == null ? 0 : qty(row.amount)
      const rate = row.rate == null ? null : qty(row.rate)
      if (stored !== 0) group.procurementValue += stored
      else if (rate !== null && rate !== 0) group.procurementValue += rate * received
      else group.unpricedQty += received
    }
    if (!group.unit && row.unit) group.unit = row.unit
    const unit = (row.unit ?? '').trim()
    if (unit && !group.units.includes(unit)) group.units.push(unit)
    if (row.date && row.date > group.lastActivity) group.lastActivity = row.date
  }

  // Received minus consumed, rather than trusting the running balance of
  // whichever row happens to be first: a filtered or re-sorted list would make
  // that the wrong row, and a total that disagrees with its own column is worse
  // than no total.
  for (const group of groups.values()) {
    group.balance = +(group.received - group.consumed).toFixed(3)
    group.procurementValue = +group.procurementValue.toFixed(2)
    group.unpricedQty = +group.unpricedQty.toFixed(3)
  }

  return [...groups.values()]
}

/** Stock state, for the colour and label a group is shown with. */
export type StockState = 'negative' | 'empty' | 'in_stock'

export function stockState(balance: number): StockState {
  if (balance < 0) return 'negative'
  if (balance === 0) return 'empty'
  return 'in_stock'
}
