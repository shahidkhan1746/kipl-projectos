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
  /** Purchases: the supplier on the list whose advance pays for it. */
  supplierId: string | null
}

/** Where the site buys fuel. The default one is assumed for a purchase naming none, at its current rate. */
export interface FuelSupplier { id: string; projectId: string; name: string; rate: number | null; isDefault: boolean; active: boolean }

export const PAYMENT_MODES = ['NEFT', 'RTGS', 'IMPS', 'UPI', 'Cheque', 'Cash'] as const
export type PaymentMode = (typeof PAYMENT_MODES)[number]

/**
 * One line of the pump account. payment: money paid in. lift: diesel taken
 * that is not in the stock register (before it began). purchase: a register
 * purchase paid from the advance.
 */
export interface PumpLine {
  id: string; kind: 'payment' | 'lift' | 'purchase'; date: string
  amount: number; estimated: boolean; litres: number | null; rate: number | null
  mode: string | null; reference: string | null; remarks: string | null; recordedByName: string | null
  /** Advance left after this line; negative when the pump is giving credit. */
  balance: number
}

export interface PumpAccount {
  supplier: { id: string; name: string; rate: number | null }
  paid: number; taken: number; litresTaken: number; balance: number
  balanceLitres: number | null; daysCovered: number | null
  warning: 'overdrawn' | 'low' | null
  lastPayment: { date: string; amount: number; mode: string | null; reference: string | null } | null
  lines: PumpLine[]
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
  /** Litres issued per day recently (up to 14 days), and how many days the stock lasts at that rate. */
  cover: Record<FuelType, { dailyAverage: number | null; daysOfCover: number | null; windowDays: number }>
}

export interface FuelRegister {
  from: string; to: string; today: string
  machines: FuelMachine[]
  entries: FuelRow[]
  summary: FuelSummary
  voided: FuelEntry[]
  suppliers: FuelSupplier[]
  /** The account with the default supplier, all time. Null until one is listed. */
  pump: PumpAccount | null
}

export interface FuelEntryWrite {
  projectId: string; entryType: FuelEntryType; date: string; litres: number
  fuelType?: FuelType; rate?: number | null; amount?: number | null; supplier?: string | null; supplierId?: string | null; billNo?: string | null
  machineId?: string | null; operator?: string | null; meterReading?: number | null; remarks?: string | null
}
export type FuelMachineWrite = Omit<FuelMachine, 'id' | 'assetId'> & { assetId?: string | null }
export interface SavedFuelEntry { entry: FuelEntry; warnings: { kind: string; message: string }[] }
export interface FuelPaymentWrite { projectId: string; supplierId?: string | null; date: string; amount: number; mode?: PaymentMode | null; reference?: string | null; remarks?: string | null }
export interface FuelSupplierWrite { projectId: string; name: string; rate?: number | null; isDefault?: boolean; active?: boolean }

export const fuelApi = {
  register: (projectId: string, from: string, to: string) => api.get<FuelRegister>('/api/v1/fuel', { params: { projectId, from, to } }),
  create: (data: FuelEntryWrite) => api.post<SavedFuelEntry>('/api/v1/fuel/entries', data),
  update: (id: string, data: FuelEntryWrite) => api.put<SavedFuelEntry>(`/api/v1/fuel/entries/${id}`, data),
  void: (id: string, projectId: string, reason: string) => api.post<FuelEntry>(`/api/v1/fuel/entries/${id}/void`, { projectId, reason }),
  createMachine: (data: FuelMachineWrite) => api.post<FuelMachine>('/api/v1/fuel/machines', data),
  updateMachine: (id: string, data: FuelMachineWrite) => api.put<FuelMachine>(`/api/v1/fuel/machines/${id}`, data),
  createPayment: (data: FuelPaymentWrite) => api.post<{ entry: PumpLine; warnings: { kind: string; message: string }[] }>('/api/v1/fuel/payments', data),
  voidPayment: (id: string, projectId: string, reason: string) => api.post(`/api/v1/fuel/payments/${id}/void`, { projectId, reason }),
  updateSupplier: (id: string, data: FuelSupplierWrite) => api.put<FuelSupplier>(`/api/v1/fuel/suppliers/${id}`, data),
}
