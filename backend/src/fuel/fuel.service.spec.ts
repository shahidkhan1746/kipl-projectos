import { BadRequestException } from '@nestjs/common'
import { FindOperator } from 'typeorm'
import { FuelService, siteToday } from './fuel.service'
import { FuelEntry, FuelMachine } from './fuel.entity'
import { FleetLog } from '../fleet/fleet-log.entity'

/** Enough of a TypeORM repository to run the service against rows in memory. */
function memoryRepo<T extends { id?: string }>(rows: T[]) {
  let seq = 0
  const matches = (row: any, where: any = {}) => Object.entries(where).every(([k, v]) => {
    if (v instanceof FindOperator) {
      const op = v as FindOperator<any>
      if (op.type === 'isNull') return row[k] === null || row[k] === undefined
      if (op.type === 'not') return !matches(row, { [k]: op.value })
      if (op.type === 'between') return row[k] >= op.value[0] && row[k] <= op.value[1]
      throw new Error(`unsupported operator ${op.type}`)
    }
    return row[k] === v
  })
  return {
    rows,
    find: jest.fn(async (o: any = {}) => rows.filter(r => matches(r, o.where))),
    findOne: jest.fn(async (o: any = {}) => {
      const found = rows.filter(r => matches(r, o.where))
      if (o.order?.date) found.sort((a: any, b: any) => a.date.localeCompare(b.date))
      return found[0] ?? null
    }),
    create: jest.fn((d: any) => ({ ...d })),
    save: jest.fn(async (d: any) => {
      if (!d.id) { d.id = `id${++seq}`; d.createdAt = new Date(2026, 10, 1, 0, 0, seq); rows.push(d) }
      return d
    }),
    query: jest.fn(async () => [{ '?column?': 1 }]),
  }
}

const PROJECT = '4a5176c7-0f53-42cc-bbd8-1a7259648a96'
const user = { id: 'u1', name: 'Site Engineer' } as any

function setup(opts: { pump?: boolean } = {}) {
  const machines = memoryRepo<Partial<FuelMachine>>([
    { id: 'pc210', projectId: PROJECT, name: 'Komatsu PC210 excavator', ownership: 'owned', operator: 'Rinku', fuelType: 'diesel', meterUnit: 'hours', logbookNames: 'PC210, Poclain', active: true },
    { id: 'sany', projectId: PROJECT, name: 'Sany excavator', ownership: 'hired', ownerName: 'Wani Infra', fuelType: 'diesel', meterUnit: 'hours', logbookNames: 'Sany', active: true },
    { id: 'old', projectId: PROJECT, name: 'Old tipper', ownership: 'owned', fuelType: 'diesel', meterUnit: 'km', active: false },
  ])
  const entries = memoryRepo<Partial<FuelEntry>>([
    { id: 'open', projectId: PROJECT, entryType: 'adjustment', fuelType: 'diesel', date: '2026-11-20', litres: 20, voidedAt: null, createdAt: new Date(2026, 10, 1) },
  ])
  const projects = { allowedProjectIds: jest.fn(async () => null), findById: jest.fn(async () => ({})) }
  const suppliers = memoryRepo<any>(opts.pump
    ? [{ id: 'hfs', projectId: PROJECT, name: 'Hazratbal Filling Station', rate: '96.42', isDefault: true, active: true },
       { id: 'iocl', projectId: PROJECT, name: 'IOCL Nishat', rate: '95.10', isDefault: false, active: true }]
    : [])
  const payments = memoryRepo<any>([])
  // The register sums logbook hours with a query builder; an empty logbook here.
  const logbook: any = memoryRepo<any>([])
  const qb: any = { select: () => qb, addSelect: () => qb, where: () => qb, groupBy: () => qb, getRawMany: async () => [] }
  logbook.createQueryBuilder = () => qb
  const service = new FuelService(entries as any, machines as any, logbook, projects as any, suppliers as any, payments as any)
  return { service, entries, machines, projects, suppliers, payments }
}

const issue = (over: any = {}) => ({ projectId: PROJECT, entryType: 'issue', date: '2026-11-22', litres: 50, machineId: 'pc210', ...over } as any)

describe('FuelService entries', () => {
  it('records an issue against the machine, with its regular operator unless someone else took it', async () => {
    const { service } = setup()
    const { entry } = await service.createEntry(issue({ meterReading: 6935.2 }), user)
    expect(entry).toMatchObject({ entryType: 'issue', machineId: 'pc210', operator: 'Rinku', meterReading: 6935.2, recordedByName: 'Site Engineer', fuelType: 'diesel' })
    const other = await service.createEntry(issue({ operator: ' Relief operator ' }), user)
    expect(other.entry.operator).toBe('Relief operator')
  })

  it('refuses an issue with no machine, to a machine no longer on site, or to another project\'s machine', async () => {
    const { service } = setup()
    await expect(service.createEntry(issue({ machineId: undefined }), user)).rejects.toThrow('Choose the machine')
    await expect(service.createEntry(issue({ machineId: 'old' }), user)).rejects.toThrow('no longer on site')
    await expect(service.createEntry(issue({ projectId: '00000000-0000-4000-8000-000000000000' }), user)).rejects.toThrow('Choose the machine')
  })

  it('works out the bill total from the rate, or the rate from the total', async () => {
    const { service } = setup()
    const a = await service.createEntry({ projectId: PROJECT, entryType: 'receipt', date: '2026-11-20', litres: 400, rate: 92.5, machineId: 'pc210' } as any, user)
    expect(a.entry).toMatchObject({ amount: 37000, rate: 92.5, machineId: null })
    const b = await service.createEntry({ projectId: PROJECT, entryType: 'receipt', date: '2026-11-22', litres: 600, amount: 55500 } as any, user)
    expect(b.entry.rate).toBe(92.5)
  })

  it('needs a reason for a stock adjustment, and allows it to be negative', async () => {
    const { service } = setup()
    await expect(service.createEntry({ projectId: PROJECT, entryType: 'adjustment', date: '2026-11-22', litres: -12 } as any, user)).rejects.toThrow('Say why')
    const { entry } = await service.createEntry({ projectId: PROJECT, entryType: 'adjustment', date: '2026-11-22', litres: -12, remarks: 'Dip check' } as any, user)
    expect(entry.litres).toBe(-12)
  })

  it('refuses future dates and nonsense quantities', async () => {
    const { service } = setup()
    await expect(service.createEntry(issue({ date: '2999-01-01' }), user)).rejects.toThrow('future')
    await expect(service.createEntry(issue({ litres: 0 }), user)).rejects.toThrow(BadRequestException)
    await expect(service.createEntry(issue({ litres: -5 }), user)).rejects.toThrow(BadRequestException)
  })

  it('saves but warns when stock goes below zero, a fill looks entered twice, or the meter goes backwards', async () => {
    const { service } = setup()
    await service.createEntry(issue({ litres: 10, meterReading: 7000 }), user)
    const { warnings } = await service.createEntry(issue({ litres: 10, meterReading: 6990 }), user)
    expect(warnings.map(w => w.kind).sort()).toEqual(['meter_backwards', 'possible_duplicate'])
    const more = await service.createEntry(issue({ litres: 50, date: '2026-11-23' }), user)
    expect(more.warnings[0]).toMatchObject({ kind: 'negative_stock' })
    expect(more.warnings[0].message).toContain('-50 L')
  })

  it('voids rather than deletes, and will not edit a voided entry', async () => {
    const { service } = setup()
    const { entry } = await service.createEntry(issue(), user)
    const voided = await service.voidEntry(entry.id, { projectId: PROJECT, reason: 'Entered twice' }, user)
    expect(voided).toMatchObject({ voidReason: 'Entered twice', voidedByName: 'Site Engineer' })
    await expect(service.updateEntry(entry.id, issue(), user)).rejects.toThrow('voided')
  })

  it('checks the project for every call', async () => {
    const { service, projects } = setup()
    projects.allowedProjectIds.mockResolvedValueOnce(['another-project'] as any)
    await expect(service.register({ projectId: PROJECT }, user)).rejects.toThrow('Not assigned')
  })
})

describe('FuelService pump account', () => {
  const receipt = (over: any = {}) => ({ projectId: PROJECT, entryType: 'receipt', date: '2026-11-25', litres: 600, ...over } as any)
  const payment = (over: any = {}) => ({ projectId: PROJECT, date: '2026-11-25', amount: 500000, mode: 'NEFT', reference: '814629437', ...over } as any)

  it('takes a purchase with no supplier from the default pump, at its current price', async () => {
    const { service } = setup({ pump: true })
    const { entry } = await service.createEntry(receipt({ billNo: '4782' }), user)
    expect(entry).toMatchObject({ supplierId: 'hfs', supplier: 'Hazratbal Filling Station', rate: 96.42, amount: 57852, billNo: '4782' })
  })

  it('keeps a bill rate given, matches a supplier by name, and leaves an unlisted one off every advance', async () => {
    const { service } = setup({ pump: true })
    expect((await service.createEntry(receipt({ rate: 97 }), user)).entry).toMatchObject({ supplierId: 'hfs', rate: 97, amount: 58200 })
    expect((await service.createEntry(receipt({ supplier: 'iocl  nishat' }), user)).entry).toMatchObject({ supplierId: 'iocl', supplier: 'IOCL Nishat', rate: 95.1 })
    expect((await service.createEntry(receipt({ supplier: 'Roadside drum seller' }), user)).entry).toMatchObject({ supplierId: null, supplier: 'Roadside drum seller', rate: null, amount: null })
    await expect(service.createEntry(receipt({ supplierId: '00000000-0000-4000-8000-000000000000' }), user)).rejects.toThrow('not on this project')
  })

  it('records a payment to the pump and warns when the same one is entered twice', async () => {
    const { service } = setup({ pump: true })
    const first = await service.createPayment(payment(), user)
    expect(first.entry).toMatchObject({ supplierId: 'hfs', entryType: 'payment', amount: 500000, mode: 'NEFT', reference: '814629437', recordedByName: 'Site Engineer' })
    expect(first.warnings).toEqual([])
    const again = await service.createPayment(payment({ date: '2026-11-24' }), user)
    expect(again.warnings[0].message).toContain('Rs 5,00,000 on 2026-11-25 (ref 814629437) is already recorded')
    await expect(service.createPayment(payment({ date: '2099-01-01' }), user)).rejects.toThrow('future')
  })

  it('shows the advance in the register: paid, taken through purchases, and left', async () => {
    const { service } = setup({ pump: true })
    await service.createPayment(payment({ amount: 100000, reference: null }), user)
    await service.createEntry(receipt({ litres: 600 }), user)
    const { pump, suppliers } = await service.register({ projectId: PROJECT, from: '2026-11-01', to: '2026-11-25' }, user)
    expect(suppliers.map(x => x.name)).toEqual(['Hazratbal Filling Station', 'IOCL Nishat'])
    expect(pump).toMatchObject({ paid: 100000, taken: 57852, balance: 42148, balanceLitres: 437 })
    expect(pump!.lines.map(l => [l.kind, l.balance])).toEqual([['payment', 100000], ['purchase', 42148]])
  })

  it('voids a payment rather than deleting it, and the advance drops', async () => {
    const { service } = setup({ pump: true })
    const { entry } = await service.createPayment(payment(), user)
    await service.voidPayment(entry.id, { projectId: PROJECT, reason: 'Entered twice' }, user)
    const { pump } = await service.register({ projectId: PROJECT, to: '2026-11-25' }, user)
    expect(pump!.paid).toBe(0)
    await expect(service.voidPayment(entry.id, { projectId: PROJECT, reason: 'again' }, user)).rejects.toThrow('already voided')
  })

  it('has no pump account until a default supplier is listed, and refuses payments to nobody', async () => {
    const { service } = setup()
    expect((await service.register({ projectId: PROJECT, to: '2026-11-25' }, user)).pump).toBeNull()
    await expect(service.createPayment(payment(), user)).rejects.toThrow('no filling station')
  })

  it('keeps one default supplier and its price editable', async () => {
    const { service, suppliers } = setup({ pump: true })
    await service.saveSupplier('hfs', { projectId: PROJECT, name: 'Hazratbal Filling Station', rate: 97.5 }, user)
    expect(suppliers.rows.find(x => x.id === 'hfs')).toMatchObject({ rate: 97.5, isDefault: true })
    await service.saveSupplier('iocl', { projectId: PROJECT, name: 'IOCL Nishat', rate: 95.1, isDefault: true }, user)
    expect(suppliers.rows.filter(x => x.isDefault).map(x => x.id)).toEqual(['iocl'])
    await expect(service.saveSupplier(null, { projectId: PROJECT, name: 'hazratbal filling station' }, user)).rejects.toThrow('already on the list')
  })
})

describe('FuelService and the Fleet logbook', () => {
  const log = (over: Partial<FleetLog> = {}) => ({ id: 'log1', projectId: PROJECT, logType: 'plant', date: '2026-11-22', machineId: 'poclain', operator: 'Rinku', hourStart: '6935.2', fuelLitres: '60', reportedBy: 'Supervisor', ...over } as any as FleetLog)

  it('turns diesel typed into a logbook entry into an issue for the matched machine', async () => {
    const { service, entries } = setup()
    await service.syncFromFleetLog(log())
    const made = entries.rows.find(r => r.fleetLogId === 'log1')!
    expect(made).toMatchObject({ entryType: 'issue', machineId: 'pc210', litres: 60, meterReading: 6935.2, logbookMachine: 'poclain', recordedByName: 'Supervisor' })
  })

  it('keeps the one issue in step when the logbook entry changes, and voids it when the diesel is taken off', async () => {
    const { service, entries } = setup()
    await service.syncFromFleetLog(log())
    await service.syncFromFleetLog(log({ fuelLitres: 80 as any }))
    expect(entries.rows.filter(r => r.fleetLogId === 'log1')).toHaveLength(1)
    expect(entries.rows.find(r => r.fleetLogId === 'log1')!.litres).toBe(80)
    await service.syncFromFleetLog(log({ fuelLitres: 0 as any }))
    expect(entries.rows.find(r => r.fleetLogId === 'log1')!.voidedAt).toBeInstanceOf(Date)
  })

  it('does not bring back an issue someone voided in the register', async () => {
    const { service, entries } = setup()
    await service.syncFromFleetLog(log())
    entries.rows.find(r => r.fleetLogId === 'log1')!.voidedAt = new Date()
    await service.syncFromFleetLog(log({ fuelLitres: 90 as any }))
    expect(entries.rows.filter(r => r.fleetLogId === 'log1' && !r.voidedAt)).toHaveLength(0)
  })

  it('ignores logbook entries from before the register started, and keeps an unlisted machine by its logbook name', async () => {
    const { service, entries } = setup()
    expect(await service.syncFromFleetLog(log({ date: '2026-11-10' }))).toBeNull()
    await service.syncFromFleetLog(log({ id: 'log2', machineId: 'Tipper 7' }))
    expect(entries.rows.find(r => r.fleetLogId === 'log2')).toMatchObject({ machineId: null, logbookMachine: 'Tipper 7' })
  })

  it('voids the issue when its logbook entry is deleted', async () => {
    const { service, entries } = setup()
    await service.syncFromFleetLog(log())
    await service.voidForFleetLog('log1')
    expect(entries.rows.find(r => r.fleetLogId === 'log1')!.voidReason).toBe('The Fleet logbook entry was deleted')
  })
})

describe('siteToday', () => {
  it('is the date in Srinagar, not on the UTC server', () => {
    expect(siteToday(new Date('2026-11-22T20:00:00Z'))).toBe('2026-11-23')
  })
})
