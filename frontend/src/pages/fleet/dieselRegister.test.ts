import { describe, expect, it } from 'vitest'
import type { FuelMachine, FuelRegister, FuelRow } from '@/api/fuel.api'
import { burnRate, coverLevel, coverText, dailySeries, describeWarning, litres, monthRange, registerCsv, registerFileName, renderRegisterPdf, rowParty } from './dieselRegister'

const machine = (over: Partial<FuelMachine>): FuelMachine => ({
  id: 'pc210', projectId: 'p', name: 'Komatsu PC210 excavator', kind: 'Excavator', ownership: 'owned', ownerName: null, assetId: null,
  operator: 'Rinku', fuelType: 'diesel', meterUnit: 'hours', logbookNames: 'PC210', active: true, ...over,
})
const machines = [machine({}), machine({ id: 'sany', name: 'Sany excavator', ownership: 'hired', ownerName: 'Wani Infra', operator: null })]
const row = (over: Partial<FuelRow>): FuelRow => ({
  id: Math.random().toString(36), projectId: 'p', entryType: 'issue', fuelType: 'diesel', date: '2026-11-22', litres: 200,
  rate: null, amount: null, supplier: null, billNo: null, machineId: 'pc210', operator: 'Rinku', meterReading: null,
  logbookMachine: null, fleetLogId: null, remarks: null, photoUrl: null, recordedByName: 'Site Engineer', createdAt: '2026-11-22T06:00:00Z',
  voidedAt: null, voidedByName: null, voidReason: null, balance: 400, cost: null, averageRate: null, ...over,
})
const register = (entries: FuelRow[]): FuelRegister => ({
  from: '2026-11-01', to: '2026-11-23', today: '2026-11-23', machines, entries, voided: [],
  summary: {
    stock: { diesel: { opening: 0, closing: 300, now: 300 }, petrol: { opening: 0, closing: 0, now: 0 } },
    totals: { diesel: { received: 1000, receivedAmount: 0, issued: 720, issuedCost: 0, issuedPricedLitres: 0, adjusted: 20 }, petrol: { received: 0, receivedAmount: 0, issued: 0, issuedCost: 0, issuedPricedLitres: 0, adjusted: 0 } },
    machines: [{ machineId: 'pc210', name: 'Komatsu PC210 excavator', ownership: 'owned', ownerName: null, operator: 'Rinku', fuelType: 'diesel', meterUnit: 'hours', litres: 400, cost: null, fills: 2, fillsWithoutMeter: 2, lastMeter: null, lastFillDate: '2026-11-22', meterRate: null, logbookUse: null, logbookRate: null }],
    hiredOwners: [{ ownerName: 'Wani Infra', litres: 250, cost: null, machines: ['Sany excavator', 'Road roller'] }],
    warnings: [],
    cover: { diesel: { dailyAverage: 180, daysOfCover: 1.7, windowDays: 4 }, petrol: { dailyAverage: null, daysOfCover: null, windowDays: 0 } },
  },
})

describe('month range', () => {
  it('runs to the end of a finished month and to today in the current one', () => {
    expect(monthRange('2026-10', '2026-11-23')).toEqual({ from: '2026-10-01', to: '2026-10-31' })
    expect(monthRange('2026-11', '2026-11-23')).toEqual({ from: '2026-11-01', to: '2026-11-23' })
    expect(monthRange('2028-02', '2028-12-01')).toEqual({ from: '2028-02-01', to: '2028-02-29' })
  })
})

describe('register text', () => {
  const byId = new Map(machines.map(m => [m.id, m]))
  it('names the machine, the hire firm, or the supplier', () => {
    expect(rowParty(row({}), byId)).toBe('Komatsu PC210 excavator')
    expect(rowParty(row({ machineId: 'sany' }), byId)).toBe('Sany excavator (Wani Infra)')
    expect(rowParty(row({ machineId: null, logbookMachine: 'Tipper' }), byId)).toBe('Tipper (not on the machine list)')
    expect(rowParty(row({ entryType: 'receipt', machineId: null, supplier: 'HP pump, Nishat', billNo: '448' }), byId)).toBe('HP pump, Nishat · Bill 448')
  })

  it('says where a consumption figure came from, or what is missing', () => {
    expect(burnRate({ meterRate: 11.67, logbookRate: null, logbookUse: null, litres: 350, meterUnit: 'hours', fills: 3 })).toEqual({ value: '11.67 L/hr', basis: 'From meter readings at each fill' })
    expect(burnRate({ meterRate: null, logbookRate: 12.5, logbookUse: 32, litres: 400, meterUnit: 'hours', fills: 2 }).basis).toBe('400 L over 32 logged hours. Only right if every working day is in the logbook')
    expect(burnRate({ meterRate: null, logbookRate: null, logbookUse: null, litres: 400, meterUnit: 'hours', fills: 2 })).toEqual({ value: 'Not known', basis: 'Record the hour meter at each fill' })
  })

  it('explains each warning in words', () => {
    expect(describeWarning({ kind: 'negative_stock', fuelType: 'diesel', date: '2026-11-22', balance: -20 })).toContain('below zero (-20 L)')
    expect(describeWarning({ kind: 'unlisted_machine', logbookMachine: 'Tipper', litres: 5 })).toContain('"Tipper"')
    expect(describeWarning({ kind: 'no_meter', machines: [{ machineId: 'a', name: 'JCB', fills: 2 }, { machineId: 'b', name: 'Road roller', fills: 1 }] })).toBe('No meter reading at any fill for JCB, Road roller, so their consumption cannot be checked. Record the meter each time.')
    expect(describeWarning({ kind: 'unpriced_receipts', fuelType: 'diesel', count: 2, litres: 1000 })).toBe('2 diesel purchases this month (1,000 L) have no rate, so the diesel issued cannot be fully costed. Edit them and enter the rate from the bill.')
    expect(litres(1234.5)).toBe('1,234.5 L')
  })
})

describe('exports', () => {
  const reg = register([
    row({ entryType: 'adjustment', machineId: null, litres: 20, balance: 20, remarks: 'Opening stock' }),
    row({ entryType: 'receipt', machineId: null, litres: 400, balance: 420, rate: 92.5, amount: 37000 }),
    row({ litres: 200, balance: 220, remarks: '=HYPERLINK("x")' }),
  ])

  it('writes the register as a spreadsheet with in, out and balance, and defuses formulas', () => {
    const lines = registerCsv(reg).split('\r\n')
    expect(lines[0]).toContain('Litres in,Litres out,Balance')
    expect(lines[1]).toContain('Stock adjustment,Opening stock,Rinku,20,,20')
    expect(lines[2]).toMatch(/,Purchased,Supplier not recorded,[^,]*,400,,420,/)
    expect(lines[3]).toContain('Issued,Komatsu PC210 excavator,Rinku,,200,220')
    expect(lines[3]).toContain(`"'=HYPERLINK(""x"")"`)
  })

  it('prints the month with the hired-machine total and signatures', () => {
    const text = renderRegisterPdf(reg, { projectName: 'Dal Lake Sewerage Scheme', month: '2026-11', now: new Date(2026, 10, 23) }).output()
    expect(text).toContain('DIESEL REGISTER')
    expect(text).toContain('Into Wani Infra')
    expect(text).toContain('Store keeper')
    expect(text).toContain('Rs 37,000')
    expect(text).toContain('Cost shown only where the purchase rate is known')
    expect(registerFileName('2026-11', 'pdf')).toBe('KIPL-diesel-register-2026-11.pdf')
  })
})

describe('stock gauge and trend', () => {
  it('bands the days of diesel left: low under 2, watch under 4', () => {
    expect([coverLevel(1.7), coverLevel(3.9), coverLevel(4), coverLevel(null)]).toEqual(['low', 'watch', 'good', 'unknown'])
  })

  it('says how long the stock lasts and roughly when it runs out', () => {
    expect(coverText({ dailyAverage: 180, daysOfCover: 1.7, windowDays: 4 }, '2026-11-24')).toBe('About 1.7 days at 180 L a day: runs out around 25 Nov')
    expect(coverText({ dailyAverage: null, daysOfCover: null, windowDays: 14 }, '2026-12-31')).toBe('No diesel issued in the last 14 days, so no rate to go on')
  })

  it('gives the stock at the end of each day, starting where the register starts', () => {
    const reg = register([
      row({ entryType: 'adjustment', machineId: null, date: '2026-11-20', litres: 20, balance: 20 }),
      row({ entryType: 'receipt', machineId: null, date: '2026-11-20', litres: 400, balance: 420 }),
      row({ date: '2026-11-20', litres: 200, balance: 220 }),
      row({ date: '2026-11-22', litres: 200, balance: 20 }),
    ])
    const days = dailySeries({ ...reg, to: '2026-11-23' })
    expect(days.map(d => [d.date, d.balance, d.issued, d.purchased])).toEqual([
      ['2026-11-20', 220, 200, 400],
      ['2026-11-21', 220, 0, 0],
      ['2026-11-22', 20, 200, 0],
      ['2026-11-23', 20, 0, 0],
    ])
  })
})
