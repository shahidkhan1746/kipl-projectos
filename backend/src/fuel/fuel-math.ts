/**
 * Pure arithmetic for the fuel register: running stock, the value of what was
 * issued, and how much each machine burns. No database, so it can be tested
 * line by line against the paper register it replaces.
 */

export type FuelKind = 'diesel' | 'petrol'
export type EntryKind = 'receipt' | 'issue' | 'adjustment'

export interface LedgerInput {
  id: string
  entryType: EntryKind
  fuelType: FuelKind
  date: string
  litres: number | string
  rate?: number | string | null
  amount?: number | string | null
  machineId?: string | null
  logbookMachine?: string | null
  meterReading?: number | string | null
  createdAt?: Date | string
}

export interface MachineInput {
  id: string
  name: string
  ownership: 'owned' | 'hired'
  ownerName?: string | null
  operator?: string | null
  fuelType: FuelKind
  meterUnit: 'hours' | 'km'
  logbookNames?: string | null
  active?: boolean
}

export interface LedgerRow<T extends LedgerInput = LedgerInput> {
  entry: T
  /** Litres this entry moved: + into stock, − out of it. */
  change: number
  /** Stock of this fuel after this entry. */
  balance: number
  /** Average rate paid for this fuel up to this entry, rupees per litre. Null until a priced receipt exists. */
  averageRate: number | null
  /** Issues only: litres at the average rate to date. */
  cost: number | null
  /** The machine, from the entry or matched from the logbook's name for it. */
  machineId: string | null
}

const num = (v: number | string | null | undefined) => (v === null || v === undefined || v === '' ? null : Number(v))
const round = (v: number, places = 2) => Math.round(v * 10 ** places) / 10 ** places

/** Within one day, stock arriving is counted before stock leaving. */
const ORDER: Record<EntryKind, number> = { adjustment: 0, receipt: 1, issue: 2 }

export function sortEntries<T extends LedgerInput>(entries: T[]): T[] {
  return [...entries].sort((a, b) =>
    a.date.localeCompare(b.date)
    || ORDER[a.entryType] - ORDER[b.entryType]
    || new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime()
    || a.id.localeCompare(b.id))
}

export function signedLitres(e: Pick<LedgerInput, 'entryType' | 'litres'>) {
  const l = Number(e.litres)
  return e.entryType === 'issue' ? -Math.abs(l) : e.entryType === 'receipt' ? Math.abs(l) : l
}

/** "JCB-01", "jcb 01" and "JCB01" are the same machine to a person typing them. */
export const normaliseName = (s: string | null | undefined) => (s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')

/** The machine a logbook entry means, from the names each machine goes by. */
export function matchLogbookName<M extends Pick<MachineInput, 'id' | 'name' | 'logbookNames'>>(name: string | null | undefined, machines: M[]): M | null {
  const key = normaliseName(name)
  if (!key) return null
  return machines.find(m => [m.name, ...(m.logbookNames ?? '').split(',')].some(n => normaliseName(n) === key)) ?? null
}

/** Every entry in order, with the stock after it and, for issues, what the fuel cost. */
export function runLedger<T extends LedgerInput>(entries: T[], machines: MachineInput[] = []): LedgerRow<T>[] {
  const stock: Record<string, number> = {}
  const bought: Record<string, { litres: number; amount: number }> = {}
  return sortEntries(entries).map(entry => {
    const fuel = entry.fuelType
    const change = signedLitres(entry)
    if (entry.entryType === 'receipt') {
      const litres = Number(entry.litres)
      const amount = num(entry.amount) ?? (num(entry.rate) !== null ? num(entry.rate)! * litres : null)
      if (amount !== null && litres > 0) {
        const b = bought[fuel] ?? { litres: 0, amount: 0 }
        bought[fuel] = { litres: b.litres + litres, amount: b.amount + amount }
      }
    }
    stock[fuel] = round((stock[fuel] ?? 0) + change)
    const b = bought[fuel]
    const averageRate = b && b.litres > 0 ? round(b.amount / b.litres) : null
    const cost = entry.entryType === 'issue' && averageRate !== null ? round(Math.abs(change) * averageRate) : null
    const machineId = entry.machineId ?? matchLogbookName(entry.logbookMachine, machines)?.id ?? null
    return { entry, change, balance: stock[fuel], averageRate, cost, machineId }
  })
}

export interface MachineUse {
  machineId: string
  name: string
  ownership: 'owned' | 'hired'
  ownerName: string | null
  operator: string | null
  fuelType: FuelKind
  meterUnit: 'hours' | 'km'
  litres: number
  cost: number | null
  fills: number
  fillsWithoutMeter: number
  lastMeter: number | null
  lastFillDate: string | null
  /** Litres per hour (or per km) between the first and last meter reading at a fill in the period. */
  meterRate: number | null
  /** Hours (or km) the Fleet logbook records for the machine in the period. */
  logbookUse: number | null
  /** Litres per hour (or per km) from the logbook's hours, when the meter readings cannot give one. */
  logbookRate: number | null
}

export type FuelWarning =
  | { kind: 'negative_stock'; fuelType: FuelKind; date: string; balance: number }
  | { kind: 'meter_backwards'; machineId: string; name: string; date: string; reading: number; previous: number }
  /** Machines whose fills this period carry no meter reading at all, so their burn cannot be checked. */
  | { kind: 'no_meter'; machines: { machineId: string; name: string; fills: number }[] }
  | { kind: 'unlisted_machine'; logbookMachine: string; litres: number }
  /** Purchases in the period with no rate or amount: issues cannot be fully valued until they have one. */
  | { kind: 'unpriced_receipts'; fuelType: FuelKind; count: number; litres: number }

export interface FuelSummary {
  stock: Record<FuelKind, { opening: number; closing: number; now: number }>
  /** issuedCost covers only issuedPricedLitres: the litres issued once a priced purchase existed. */
  totals: Record<FuelKind, { received: number; receivedAmount: number; issued: number; issuedCost: number; issuedPricedLitres: number; adjusted: number }>
  machines: MachineUse[]
  hiredOwners: { ownerName: string; litres: number; cost: number | null; machines: string[] }[]
  warnings: FuelWarning[]
}

const FUELS: FuelKind[] = ['diesel', 'petrol']

/**
 * What a period looks like: stock at its start and end, what came in and went
 * out, each machine's burn, and diesel put into hired machines by firm.
 */
export function summarise<T extends LedgerInput>(rows: LedgerRow<T>[], machines: MachineInput[], from: string, to: string, logbookUse: Map<string, number> = new Map()): FuelSummary {
  const stock = {} as FuelSummary['stock']
  const totals = {} as FuelSummary['totals']
  for (const f of FUELS) {
    const ofFuel = rows.filter(r => r.entry.fuelType === f)
    const before = ofFuel.filter(r => r.entry.date < from)
    const upTo = ofFuel.filter(r => r.entry.date <= to)
    stock[f] = {
      opening: before.length ? before[before.length - 1].balance : 0,
      closing: upTo.length ? upTo[upTo.length - 1].balance : 0,
      now: ofFuel.length ? ofFuel[ofFuel.length - 1].balance : 0,
    }
    const inPeriod = ofFuel.filter(r => r.entry.date >= from && r.entry.date <= to)
    const receipts = inPeriod.filter(r => r.entry.entryType === 'receipt')
    const issues = inPeriod.filter(r => r.entry.entryType === 'issue')
    totals[f] = {
      received: round(receipts.reduce((s, r) => s + r.change, 0)),
      receivedAmount: round(receipts.reduce((s, r) => s + (num(r.entry.amount) ?? (num(r.entry.rate) !== null ? num(r.entry.rate)! * Number(r.entry.litres) : 0)), 0)),
      issued: round(-issues.reduce((s, r) => s + r.change, 0)),
      issuedCost: round(issues.reduce((s, r) => s + (r.cost ?? 0), 0)),
      issuedPricedLitres: round(issues.filter(r => r.cost !== null).reduce((s, r) => s - r.change, 0)),
      adjusted: round(inPeriod.filter(r => r.entry.entryType === 'adjustment').reduce((s, r) => s + r.change, 0)),
    }
  }

  const warnings: FuelWarning[] = []
  for (const f of FUELS) {
    const unpriced = rows.filter(r => r.entry.fuelType === f && r.entry.entryType === 'receipt' && r.entry.date >= from && r.entry.date <= to
      && num(r.entry.amount) === null && num(r.entry.rate) === null)
    if (unpriced.length) warnings.push({ kind: 'unpriced_receipts', fuelType: f, count: unpriced.length, litres: round(unpriced.reduce((s, r) => s + r.change, 0)) })
    const firstNegative = rows.find(r => r.entry.fuelType === f && r.balance < 0 && r.entry.date <= to)
    if (firstNegative) warnings.push({ kind: 'negative_stock', fuelType: f, date: firstNegative.entry.date, balance: firstNegative.balance })
  }

  const periodIssues = rows.filter(r => r.entry.entryType === 'issue' && r.entry.date >= from && r.entry.date <= to)
  const used: MachineUse[] = []
  const unmetered: { machineId: string; name: string; fills: number }[] = []
  for (const m of machines) {
    const mine = periodIssues.filter(r => r.machineId === m.id)
    const use = logbookUse.get(m.id) ?? null
    if (!mine.length && !use && m.active === false) continue
    const litres = round(mine.reduce((s, r) => s + Math.abs(r.change), 0))
    const costs = mine.map(r => r.cost)
    const readings = mine.filter(r => num(r.entry.meterReading) !== null)
    // Fill to fill: the fuel put in from the first reading up to (not including)
    // the last fill burns over the hours between those two readings.
    let meterRate: number | null = null
    if (readings.length >= 2) {
      const first = readings[0], last = readings[readings.length - 1]
      const span = Number(last.entry.meterReading) - Number(first.entry.meterReading)
      const burnt = mine.slice(mine.indexOf(first), mine.indexOf(last)).reduce((s, r) => s + Math.abs(r.change), 0)
      if (span > 0 && burnt > 0) meterRate = round(burnt / span)
    }
    for (let i = 1; i < readings.length; i++) {
      const prev = Number(readings[i - 1].entry.meterReading), cur = Number(readings[i].entry.meterReading)
      if (cur < prev) warnings.push({ kind: 'meter_backwards', machineId: m.id, name: m.name, date: readings[i].entry.date, reading: cur, previous: prev })
    }
    const fillsWithoutMeter = mine.length - readings.length
    if (mine.length && fillsWithoutMeter === mine.length) unmetered.push({ machineId: m.id, name: m.name, fills: mine.length })
    const allReadings = rows.filter(r => r.machineId === m.id && r.entry.entryType === 'issue' && num(r.entry.meterReading) !== null && r.entry.date <= to)
    used.push({
      machineId: m.id, name: m.name, ownership: m.ownership, ownerName: m.ownerName ?? null, operator: m.operator ?? null,
      fuelType: m.fuelType, meterUnit: m.meterUnit,
      litres,
      cost: !mine.length ? 0 : costs.every(c => c !== null) ? round(costs.reduce((s, c) => s + (c ?? 0), 0)) : null,
      fills: mine.length, fillsWithoutMeter,
      lastMeter: allReadings.length ? Number(allReadings[allReadings.length - 1].entry.meterReading) : null,
      lastFillDate: mine.length ? mine[mine.length - 1].entry.date : null,
      meterRate,
      logbookUse: use,
      logbookRate: meterRate === null && use && use > 0 && litres > 0 ? round(litres / use) : null,
    })
  }

  if (unmetered.length) warnings.push({ kind: 'no_meter', machines: unmetered })

  const unlisted = new Map<string, number>()
  for (const r of periodIssues) {
    if (r.machineId) continue
    const name = r.entry.logbookMachine?.trim() || 'Not named'
    unlisted.set(name, round((unlisted.get(name) ?? 0) + Math.abs(r.change)))
  }
  for (const [logbookMachine, litres] of unlisted) warnings.push({ kind: 'unlisted_machine', logbookMachine, litres })

  const owners = new Map<string, { ownerName: string; litres: number; cost: number | null; machines: string[] }>()
  for (const u of used) {
    if (u.ownership !== 'hired' || !u.litres) continue
    const key = u.ownerName?.trim() || 'Hire firm not named'
    const o = owners.get(key) ?? { ownerName: key, litres: 0, cost: 0, machines: [] }
    o.litres = round(o.litres + u.litres)
    o.cost = o.cost === null || u.cost === null ? null : round(o.cost + u.cost)
    o.machines.push(u.name)
    owners.set(key, o)
  }

  return { stock, totals, machines: used, hiredOwners: [...owners.values()], warnings }
}
