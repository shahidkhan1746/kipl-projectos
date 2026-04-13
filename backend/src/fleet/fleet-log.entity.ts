import { Entity, Column } from 'typeorm'
import { BaseEntity } from '../shared/entities/base.entity'

export type LogType = 'vehicle' | 'plant'

@Entity('fleet_logs')
export class FleetLog extends BaseEntity {
  @Column({ name: 'project_id' }) projectId: string
  @Column({ name: 'log_type' }) logType: LogType
  @Column({ type: 'date' }) date: string

  // ── Vehicle fields ──────────────────────────────────────────────────────────
  @Column({ nullable: true }) vehicle: string          // e.g. "SUV - JK01AB1234"
  @Column({ nullable: true }) driver: string
  @Column({ name: 'meter_start', type: 'decimal', precision: 10, scale: 1, nullable: true }) meterStart: number
  @Column({ name: 'meter_end',   type: 'decimal', precision: 10, scale: 1, nullable: true }) meterEnd: number
  @Column({ name: 'distance_km', type: 'decimal', precision: 10, scale: 1, nullable: true }) distanceKm: number
  @Column({ name: 'passenger_name', nullable: true }) passengerName: string
  @Column({ name: 'passenger_designation', nullable: true }) passengerDesignation: string
  @Column({ nullable: true }) purpose: string          // Official Duty / Inspection / Other
  @Column({ name: 'from_location', nullable: true }) fromLocation: string
  @Column({ name: 'to_location',   nullable: true }) toLocation: string

  // ── Plant/Equipment fields ──────────────────────────────────────────────────
  @Column({ name: 'machine_id',   nullable: true }) machineId: string    // PC210, JCB-01
  @Column({ name: 'machine_type', nullable: true }) machineType: string  // Excavator, Backhoe
  @Column({ nullable: true }) operator: string
  @Column({ name: 'hour_start', type: 'decimal', precision: 10, scale: 1, nullable: true }) hourStart: number
  @Column({ name: 'hour_close', type: 'decimal', precision: 10, scale: 1, nullable: true }) hourClose: number
  @Column({ name: 'hours_worked', type: 'decimal', precision: 10, scale: 1, nullable: true }) hoursWorked: number
  @Column({ name: 'work_zone',    nullable: true }) workZone: string
  @Column({ name: 'work_description', type: 'text', nullable: true }) workDescription: string
  @Column({ name: 'breakdown', default: false }) breakdown: boolean
  @Column({ name: 'breakdown_details', type: 'text', nullable: true }) breakdownDetails: string

  // ── Common fields ───────────────────────────────────────────────────────────
  @Column({ name: 'fuel_litres', type: 'decimal', precision: 10, scale: 1, nullable: true }) fuelLitres: number
  @Column({ name: 'fuel_cost',   type: 'decimal', precision: 10, scale: 2, nullable: true }) fuelCost: number
  @Column({ type: 'text', nullable: true }) remarks: string
  @Column({ name: 'reported_by', nullable: true }) reportedBy: string
  @Column({ name: 'reported_via', default: 'manual' }) reportedVia: string // manual | whatsapp | app
  @Column({ name: 'photo_url',   nullable: true }) photoUrl: string
}
