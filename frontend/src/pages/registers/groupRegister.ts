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

export interface DaysOfCover {
  days: number | null
  dailyBurn: number
  burnWindowDays: number
  status: 'depleted' | 'critical' | 'moderate' | 'healthy' | 'dormant'
  label: string
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
  /** Trailing burn rate & days of cover */
  daysOfCover: DaysOfCover
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
        daysOfCover: {
          days: null,
          dailyBurn: 0,
          burnWindowDays: 0,
          status: 'dormant',
          label: 'No recent burn',
        },
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

  const now = Date.now()
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  // Received minus consumed, rather than trusting the running balance of
  // whichever row happens to be first: a filtered or re-sorted list would make
  // that the wrong row, and a total that disagrees with its own column is worse
  // than no total.
  for (const group of groups.values()) {
    group.balance = +(group.received - group.consumed).toFixed(3)
    group.procurementValue = +group.procurementValue.toFixed(2)
    group.unpricedQty = +group.unpricedQty.toFixed(3)

    // Compute trailing burn rate & days-of-cover
    let dailyBurn = 0
    let burnWindowDays = 0

    const rows7d = group.rows.filter(r => r.date && r.date >= sevenDaysAgo && qty(r.consumedQty) > 0)
    const consumed7d = rows7d.reduce((sum, r) => sum + qty(r.consumedQty), 0)

    if (consumed7d > 0) {
      dailyBurn = +(consumed7d / 7).toFixed(2)
      burnWindowDays = 7
    } else {
      const rows30d = group.rows.filter(r => r.date && r.date >= thirtyDaysAgo && qty(r.consumedQty) > 0)
      const consumed30d = rows30d.reduce((sum, r) => sum + qty(r.consumedQty), 0)
      if (consumed30d > 0) {
        dailyBurn = +(consumed30d / 30).toFixed(2)
        burnWindowDays = 30
      } else if (group.consumed > 0) {
        const validDates = group.rows.map(r => r.date).filter(Boolean).sort() as string[]
        if (validDates.length > 0) {
          const firstDate = new Date(validDates[0]).getTime()
          const lastDate = new Date(validDates[validDates.length - 1]).getTime()
          const spanDays = Math.max(1, Math.round((lastDate - firstDate) / (1000 * 3600 * 24)))
          dailyBurn = +(group.consumed / spanDays).toFixed(2)
          burnWindowDays = spanDays
        }
      }
    }

    if (group.balance <= 0) {
      group.daysOfCover = {
        days: 0,
        dailyBurn,
        burnWindowDays,
        status: 'depleted',
        label: 'Stock Depleted (0d)',
      }
    } else if (dailyBurn > 0) {
      const days = Math.round(group.balance / dailyBurn)
      const status = days <= 5 ? 'critical' : days <= 14 ? 'moderate' : 'healthy'
      const label = days <= 5
        ? `⚠️ Reorder: ${days}d cover (${dailyBurn} ${group.unit}/d)`
        : days <= 14
        ? `Moderate: ${days}d cover`
        : `Healthy: ${days}d cover`

      group.daysOfCover = {
        days,
        dailyBurn,
        burnWindowDays,
        status,
        label,
      }
    } else {
      group.daysOfCover = {
        days: null,
        dailyBurn: 0,
        burnWindowDays: 0,
        status: 'dormant',
        label: 'No recent burn',
      }
    }
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
