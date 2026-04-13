import { Entity, Column, CreateDateColumn } from 'typeorm'
import { BaseEntity } from '../shared/entities/base.entity'

export enum AttendanceStatus { PRESENT='present', ABSENT='absent', HALF_DAY='half_day', LEAVE='leave', HOLIDAY='holiday' }
export enum AttendanceSource { MOBILE='mobile', MANUAL='manual', BIOMETRIC='biometric' }

@Entity('attendance')
export class Attendance extends BaseEntity {
  @Column({ name: 'employee_id' }) employeeId: string
  @Column({ name: 'project_id', nullable: true }) projectId: string
  @Column({ type: 'date' }) date: string
  @Column({ name: 'check_in_time', nullable: true }) checkInTime: Date
  @Column({ name: 'check_in_lat', type: 'decimal', precision: 10, scale: 8, nullable: true }) checkInLat: number
  @Column({ name: 'check_in_lng', type: 'decimal', precision: 11, scale: 8, nullable: true }) checkInLng: number
  @Column({ name: 'check_out_time', nullable: true }) checkOutTime: Date
  @Column({ name: 'check_out_lat', type: 'decimal', precision: 10, scale: 8, nullable: true }) checkOutLat: number
  @Column({ name: 'check_out_lng', type: 'decimal', precision: 11, scale: 8, nullable: true }) checkOutLng: number
  @Column({ name: 'hours_worked', type: 'decimal', precision: 5, scale: 2, nullable: true }) hoursWorked: number
  @Column({ name: 'geo_verified', default: false }) geoVerified: boolean
  @Column({ name: 'distance_from_site', type: 'integer', nullable: true }) distanceFromSite: number
  @Column({ type: 'enum', enum: AttendanceStatus, default: AttendanceStatus.PRESENT }) status: AttendanceStatus
  @Column({ type: 'enum', enum: AttendanceSource, default: AttendanceSource.MANUAL }) source: AttendanceSource
  @Column({ type: 'text', nullable: true }) remarks: string
}