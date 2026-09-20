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
  /** Most recent date recorded against this material, or '' when none is. */
  lastActivity: string
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
    const material = row.material ?? ''
    let group = groups.get(material)
    if (!group) {
      group = {
        material,
        unit: row.unit ?? '',
        rows: [],
        received: 0,
        consumed: 0,
        balance: 0,
        hasConsumption: false,
        lastActivity: '',
      }
      groups.set(material, group)
    }

    group.rows.push(row)
    group.received += qty(row.receivedQty)
    group.consumed += qty(row.consumedQty)
    if (qty(row.consumedQty) > 0) group.hasConsumption = true
    if (!group.unit && row.unit) group.unit = row.unit
    if (row.date && row.date > group.lastActivity) group.lastActivity = row.date
  }

  // Received minus consumed, rather than trusting the running balance of
  // whichever row happens to be first: a filtered or re-sorted list would make
  // that the wrong row, and a total that disagrees with its own column is worse
  // than no total.
  for (const group of groups.values()) {
    group.balance = +(group.received - group.consumed).toFixed(3)
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
