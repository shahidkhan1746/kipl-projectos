import api from './client'

export type FuelType = 'diesel' | 'petrol'
export type FuelEntryType = 'receipt' | 'issue' | 'adjustment'
export type MeterUnit = 'hours' | 'km'

export interface FuelMachine {
  id: string; projectId: string; name: string; kind: string | null
  ownership: 'owned' | 'hired'; ownerName: string | null; assetId: string | null
  operator: string | null; fuelType: FuelType; meterUnit: MeterUnit
  /** Names the Fleet logbook uses for it, comma-separated. */
  logbookNames: string | null
  active: boolean
}

export interface FuelEntry {
  id: string; projectId: string; entryType: FuelEntryType; fuelType: FuelType; date: string
  litres: number; rate: number | null; amount: number | null; supplier: string | null; billNo: string | null
  machineId: string | null; operator: string | null; meterReading: number | null
  logbookMachine: string | null; fleetLogId: string | null
  remarks: string | null; photoUrl: string | null; recordedByName: string | null; createdAt: string
  voidedAt: string | null; voidedByName: string | null; voidReason: string | null
}

/** A register line: the entry with the stock after it and, for issues, its cost at the average rate. */
export interface FuelRow extends FuelEntry { balance: number; cost: number | null; averageRate: number | null }

export interface MachineUse {
  machineId: string; name: string; ownership: 'owned' | 'hired'; ownerName: string | null; operator: string | null
  fuelType: FuelType; meterUnit: MeterUnit
  litres: number; cost: number | null; fills: number; fillsWithoutMeter: number
  lastMeter: number | null; lastFillDate: string | null
  meterRate: number | null; logbookUse: number | null; logbookRate: number | null
}

export type FuelWarning =
  | { kind: 'negative_stock'; fuelType: FuelType; date: string; balance: number }
  | { kind: 'meter_backwards'; machineId: string; name: string; date: string; reading: number; previous: number }
  | { kind: 'no_meter'; machines: { machineId: string; name: string; fills: number }[] }
  | { kind: 'unlisted_machine'; logbookMachine: string; litres: number }
  | { kind: 'unpriced_receipts'; fuelType: FuelType; count: number; litres: number }

export interface FuelSummary {
  stock: Record<FuelType, { opening: number; closing: number; now: number }>
  totals: Record<FuelType, { received: number; receivedAmount: number; issued: number; issuedCost: number; issuedPricedLitres: number; adjusted: number }>
  machines: MachineUse[]
  hiredOwners: { ownerName: string; litres: number; cost: number | null; machines: string[] }[]
  warnings: FuelWarning[]
}

export interface FuelRegister {
  from: string; to: string; today: string
  machines: FuelMachine[]
  entries: FuelRow[]
  summary: FuelSummary
  voided: FuelEntry[]
}

export interface FuelEntryWrite {
  projectId: string; entryType: FuelEntryType; date: string; litres: number
  fuelType?: FuelType; rate?: number | null; amount?: number | null; supplier?: string | null; billNo?: string | null
  machineId?: string | null; operator?: string | null; meterReading?: number | null; remarks?: string | null
}
export type FuelMachineWrite = Omit<FuelMachine, 'id' | 'assetId'> & { assetId?: string | null }
export interface SavedFuelEntry { entry: FuelEntry; warnings: { kind: string; message: string }[] }

export const fuelApi = {
  register: (projectId: string, from: string, to: string) => api.get<FuelRegister>('/api/v1/fuel', { params: { projectId, from, to } }),
  create: (data: FuelEntryWrite) => api.post<SavedFuelEntry>('/api/v1/fuel/entries', data),
  update: (id: string, data: FuelEntryWrite) => api.put<SavedFuelEntry>(`/api/v1/fuel/entries/${id}`, data),
  void: (id: string, projectId: string, reason: string) => api.post<FuelEntry>(`/api/v1/fuel/entries/${id}/void`, { projectId, reason }),
  createMachine: (data: FuelMachineWrite) => api.post<FuelMachine>('/api/v1/fuel/machines', data),
  updateMachine: (id: string, data: FuelMachineWrite) => api.put<FuelMachine>(`/api/v1/fuel/machines/${id}`, data),
}
