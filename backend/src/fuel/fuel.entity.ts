import { Column, Entity, Index } from 'typeorm'
import { BaseEntity } from '../shared/entities/base.entity'

/**
 * The site's diesel (and petrol) store: what came in, what went out to which
 * machine, and what is left in the drums.
 *
 * Kept with Fleet & Plant rather than in the material register: that register
 * is the cement and steel record signed by UEED, and fuel needs what it does
 * not have — the machine it went into and the hour meter at the time, which is
 * the only way to tell normal burn from diesel walking off site.
 */

export const FUEL_TYPES = ['diesel', 'petrol'] as const
export type FuelType = (typeof FUEL_TYPES)[number]

/** receipt: bought into site stock. issue: put into a machine. adjustment: opening stock or a physical stock check, signed. */
export const FUEL_ENTRY_TYPES = ['receipt', 'issue', 'adjustment'] as const
export type FuelEntryType = (typeof FUEL_ENTRY_TYPES)[number]

export const MACHINE_OWNERSHIP = ['owned', 'hired'] as const
export type MachineOwnership = (typeof MACHINE_OWNERSHIP)[number]

export const METER_UNITS = ['hours', 'km'] as const
export type MeterUnit = (typeof METER_UNITS)[number]

/** A machine or vehicle that takes fuel from the site store. */
@Entity('fuel_machines')
@Index(['projectId'])
export class FuelMachine extends BaseEntity {
  @Column({ name: 'project_id', type: 'varchar' }) projectId: string
  /** "Komatsu PC210 excavator" */
  @Column({ type: 'varchar', length: 120 }) name: string
  /** Excavator, Backhoe loader, Roller, DG set, Car… */
  @Column({ type: 'varchar', length: 60, nullable: true }) kind: string | null
  @Column({ type: 'varchar', length: 10, default: 'owned' }) ownership: MachineOwnership
  /** Who it is hired from. Required for hired machines: diesel put into them is checked against that firm's bill. */
  @Column({ name: 'owner_name', type: 'varchar', length: 160, nullable: true }) ownerName: string | null
  /** The asset register record, for machines the company owns. */
  @Column({ name: 'asset_id', type: 'uuid', nullable: true }) assetId: string | null
  /** The regular operator or driver, filled in on each issue by default. */
  @Column({ type: 'varchar', length: 120, nullable: true }) operator: string | null
  @Column({ name: 'fuel_type', type: 'varchar', length: 10, default: 'diesel' }) fuelType: FuelType
  /** What its meter counts: engine hours for plant, km for vehicles. */
  @Column({ name: 'meter_unit', type: 'varchar', length: 10, default: 'hours' }) meterUnit: MeterUnit
  /**
   * The names this machine goes by in the Fleet logbook, comma-separated
   * ("PC210, Poclain"). The logbook's machine ID is typed by hand, so diesel
   * entered there is matched to a machine through these.
   */
  @Column({ name: 'logbook_names', type: 'varchar', length: 300, nullable: true }) logbookNames: string | null
  @Column({ type: 'boolean', default: true }) active: boolean
}

/** One movement of fuel in or out of the site store. Never deleted: a wrong entry is voided with a reason. */
@Entity('fuel_entries')
@Index(['projectId', 'date'])
export class FuelEntry extends BaseEntity {
  @Column({ name: 'project_id', type: 'varchar' }) projectId: string
  @Column({ name: 'entry_type', type: 'varchar', length: 12 }) entryType: FuelEntryType
  @Column({ name: 'fuel_type', type: 'varchar', length: 10, default: 'diesel' }) fuelType: FuelType
  @Column({ type: 'date' }) date: string
  /** Always positive for receipts and issues; signed for adjustments (a stock check that finds less is negative). */
  @Column({ type: 'decimal', precision: 10, scale: 2 }) litres: number
  /** Receipts: rupees per litre and the bill total. */
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true }) rate: number | null
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true }) amount: number | null
  @Column({ type: 'varchar', length: 160, nullable: true }) supplier: string | null
  @Column({ name: 'bill_no', type: 'varchar', length: 80, nullable: true }) billNo: string | null
  /** Issues: the machine, who received it, and its meter at the time. */
  @Column({ name: 'machine_id', type: 'uuid', nullable: true }) machineId: string | null
  @Column({ type: 'varchar', length: 120, nullable: true }) operator: string | null
  @Column({ name: 'meter_reading', type: 'decimal', precision: 12, scale: 1, nullable: true }) meterReading: number | null
  /** The machine as the Fleet logbook named it, for issues that came from a logbook entry. */
  @Column({ name: 'logbook_machine', type: 'varchar', length: 120, nullable: true }) logbookMachine: string | null
  /** The Fleet logbook entry this issue was recorded through, if any. */
  @Column({ name: 'fleet_log_id', type: 'uuid', nullable: true }) fleetLogId: string | null
  @Column({ type: 'text', nullable: true }) remarks: string | null
  @Column({ name: 'photo_url', type: 'varchar', length: 500, nullable: true }) photoUrl: string | null
  @Column({ name: 'recorded_by_id', type: 'uuid', nullable: true }) recordedById: string | null
  @Column({ name: 'recorded_by_name', type: 'varchar', length: 120, nullable: true }) recordedByName: string | null
  @Column({ name: 'voided_at', type: 'timestamp', nullable: true }) voidedAt: Date | null
  @Column({ name: 'voided_by_name', type: 'varchar', length: 120, nullable: true }) voidedByName: string | null
  @Column({ name: 'void_reason', type: 'text', nullable: true }) voidReason: string | null
}
