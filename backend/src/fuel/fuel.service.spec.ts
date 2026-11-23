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

function setup() {
  const machines = memoryRepo<Partial<FuelMachine>>([
    { id: 'pc210', projectId: PROJECT, name: 'Komatsu PC210 excavator', ownership: 'owned', operator: 'Rinku', fuelType: 'diesel', meterUnit: 'hours', logbookNames: 'PC210, Poclain', active: true },
    { id: 'sany', projectId: PROJECT, name: 'Sany excavator', ownership: 'hired', ownerName: 'Wani Infra', fuelType: 'diesel', meterUnit: 'hours', logbookNames: 'Sany', active: true },
    { id: 'old', projectId: PROJECT, name: 'Old tipper', ownership: 'owned', fuelType: 'diesel', meterUnit: 'km', active: false },
  ])
  const entries = memoryRepo<Partial<FuelEntry>>([
    { id: 'open', projectId: PROJECT, entryType: 'adjustment', fuelType: 'diesel', date: '2026-11-20', litres: 20, voidedAt: null, createdAt: new Date(2026, 10, 1) },
  ])
  const projects = { allowedProjectIds: jest.fn(async () => null), findById: jest.fn(async () => ({})) }
  const service = new FuelService(entries as any, machines as any, memoryRepo<any>([]) as any, projects as any)
  return { service, entries, machines, projects }
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
