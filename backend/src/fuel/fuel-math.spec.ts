import { LedgerInput, MachineInput, matchLogbookName, runLedger, sortEntries, summarise } from './fuel-math'

const machines: MachineInput[] = [
  { id: 'pc210', name: 'Komatsu PC210 excavator', ownership: 'owned', operator: 'Rinku', fuelType: 'diesel', meterUnit: 'hours', logbookNames: 'PC210, Poclain' },
  { id: 'jcb', name: 'JCB 3DX backhoe loader', ownership: 'owned', operator: 'Yasir', fuelType: 'diesel', meterUnit: 'hours', logbookNames: 'JCB-01, JCB' },
  { id: 'sany', name: 'Sany excavator', ownership: 'hired', ownerName: 'Wani Infra', fuelType: 'diesel', meterUnit: 'hours', logbookNames: 'Sany' },
  { id: 'roller', name: 'Road roller', ownership: 'hired', ownerName: 'Wani Infra', fuelType: 'diesel', meterUnit: 'hours', logbookNames: 'Roller' },
]
let seq = 0
const e = (entryType: LedgerInput['entryType'], date: string, litres: number, more: Partial<LedgerInput> = {}): LedgerInput =>
  ({ id: `e${++seq}`, entryType, fuelType: 'diesel', date, litres, createdAt: new Date(2026, 10, 1, 0, 0, seq), ...more })

/** The site's Diesel_Log.xlsx, 20–23 Nov 2026, as entries. */
const sheet = () => [
  e('adjustment', '2026-11-20', 20),
  e('receipt', '2026-11-20', 400),
  e('issue', '2026-11-20', 200, { machineId: 'pc210' }),
  e('issue', '2026-11-22', 200, { machineId: 'pc210' }),
  e('issue', '2026-11-22', 20, { machineId: 'jcb' }),
  e('receipt', '2026-11-22', 600),
  e('issue', '2026-11-22', 200, { machineId: 'sany' }),
  e('issue', '2026-11-23', 50, { machineId: 'roller' }),
  e('issue', '2026-11-23', 50, { machineId: 'jcb' }),
]

describe('fuel ledger', () => {
  it('reproduces the paper register, ending at 300 L', () => {
    const rows = runLedger(sheet(), machines)
    expect(rows.map(r => r.balance)).toEqual([20, 420, 220, 820, 620, 600, 400, 350, 300])
    expect(rows[rows.length - 1].balance).toBe(300)
  })

  it('counts a delivery before the day\'s issues, whatever order they were typed in', () => {
    const order = sortEntries(sheet()).filter(x => x.date === '2026-11-22').map(x => x.entryType)
    expect(order).toEqual(['receipt', 'issue', 'issue', 'issue'])
  })

  it('values issues at the average rate paid so far', () => {
    const rows = runLedger([
      e('receipt', '2026-11-01', 100, { rate: 90 }),
      e('receipt', '2026-11-02', 100, { amount: 9400 }),
      e('issue', '2026-11-03', 50, { machineId: 'jcb' }),
    ], machines)
    expect(rows[2].averageRate).toBe(92)
    expect(rows[2].cost).toBe(4600)
    const totals = summarise(rows, machines, '2026-11-01', '2026-11-30').totals.diesel
    expect(totals).toMatchObject({ issued: 50, issuedCost: 4600, issuedPricedLitres: 50 })
  })

  it('leaves the cost blank until a priced purchase exists', () => {
    expect(runLedger(sheet(), machines)[2].cost).toBeNull()
  })

  it('keeps diesel and petrol stock apart', () => {
    const rows = runLedger([e('receipt', '2026-11-01', 100), e('receipt', '2026-11-01', 10, { fuelType: 'petrol' }), e('issue', '2026-11-02', 4, { fuelType: 'petrol' })])
    expect(rows.map(r => [r.entry.fuelType, r.balance])).toEqual([['diesel', 100], ['petrol', 10], ['petrol', 6]])
  })
})

describe('logbook names', () => {
  it('match however the machine ID was typed', () => {
    expect(matchLogbookName('jcb 01', machines)?.id).toBe('jcb')
    expect(matchLogbookName('PC-210', machines)?.id).toBe('pc210')
    expect(matchLogbookName('Komatsu PC210 Excavator', machines)?.id).toBe('pc210')
    expect(matchLogbookName('Tipper', machines)).toBeNull()
    expect(matchLogbookName('', machines)).toBeNull()
  })
})

describe('summary for a period', () => {
  it('gives opening and closing stock, what came in and went out, and diesel put into hired machines by firm', () => {
    const rows = runLedger(sheet(), machines)
    const s = summarise(rows, machines, '2026-11-21', '2026-11-23')
    expect(s.stock.diesel).toEqual({ opening: 220, closing: 300, now: 300 })
    expect(s.totals.diesel).toMatchObject({ received: 600, issued: 520, adjusted: 0 })
    expect(s.warnings).toContainEqual({ kind: 'unpriced_receipts', fuelType: 'diesel', count: 1, litres: 600 })
    expect(s.machines.find(m => m.machineId === 'jcb')).toMatchObject({ litres: 70, fills: 2, operator: 'Yasir' })
    expect(s.hiredOwners).toEqual([{ ownerName: 'Wani Infra', litres: 250, cost: null, machines: ['Sany excavator', 'Road roller'] }])
  })

  it('works out litres per hour from meter readings at each fill', () => {
    const rows = runLedger([
      e('receipt', '2026-11-01', 1000),
      e('issue', '2026-11-02', 200, { machineId: 'pc210', meterReading: 6900 }),
      e('issue', '2026-11-04', 150, { machineId: 'pc210', meterReading: 6916 }),
      e('issue', '2026-11-06', 180, { machineId: 'pc210', meterReading: 6930 }),
    ], machines)
    const pc = summarise(rows, machines, '2026-11-01', '2026-11-30').machines.find(m => m.machineId === 'pc210')!
    // 200 + 150 litres burnt over 30 hours; the last fill is still in the tank.
    expect(pc.meterRate).toBe(11.67)
    expect(pc.lastMeter).toBe(6930)
  })

  it('falls back to logbook hours when fills have no meter readings, and says so', () => {
    const rows = runLedger(sheet(), machines)
    const s = summarise(rows, machines, '2026-11-01', '2026-11-30', new Map([['pc210', 32]]))
    const pc = s.machines.find(m => m.machineId === 'pc210')!
    expect(pc.meterRate).toBeNull()
    expect(pc.logbookRate).toBe(12.5)
    expect(s.warnings.filter(w => w.kind === 'no_meter')).toEqual([{ kind: 'no_meter', machines: [{ machineId: 'pc210', name: 'Komatsu PC210 excavator', fills: 2 }, { machineId: 'jcb', name: 'JCB 3DX backhoe loader', fills: 2 }, { machineId: 'sany', name: 'Sany excavator', fills: 1 }, { machineId: 'roller', name: 'Road roller', fills: 1 }] }])
  })

  it('warns when stock goes below zero, a meter goes backwards, or the logbook names a machine not on the list', () => {
    const rows = runLedger([
      e('receipt', '2026-11-01', 100),
      e('issue', '2026-11-02', 80, { machineId: 'jcb', meterReading: 500 }),
      e('issue', '2026-11-03', 40, { machineId: 'jcb', meterReading: 480 }),
      e('issue', '2026-11-03', 5, { logbookMachine: 'Tipper' }),
    ], machines)
    const kinds = summarise(rows, machines, '2026-11-01', '2026-11-30').warnings
    expect(kinds).toContainEqual({ kind: 'negative_stock', fuelType: 'diesel', date: '2026-11-03', balance: -20 })
    expect(kinds).toContainEqual(expect.objectContaining({ kind: 'meter_backwards', machineId: 'jcb', reading: 480, previous: 500 }))
    expect(kinds).toContainEqual({ kind: 'unlisted_machine', logbookMachine: 'Tipper', litres: 5 })
  })
})
