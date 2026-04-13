import { Entity, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm'
import { BaseEntity } from '../shared/entities/base.entity'

export enum TimesheetStatus { DRAFT = 'draft', SUBMITTED = 'submitted', APPROVED = 'approved', REJECTED = 'rejected' }

@Entity('timesheets')
export class Timesheet extends BaseEntity {
  @Column({ name: 'employee_id' })
  employeeId: string

  @Column({ name: 'project_id', nullable: true })
  projectId: string

  @Column({ type: 'date' })
  date: string

  // Array of activity objects: { time, activity, location, remarks }
  @Column({ type: 'jsonb', default: [] })
  activities: Array<{
    time?: string
    activity: string
    location?: string
    category?: string
  }>

  @Column({ name: 'attendance_status', default: 'present' })
  attendanceStatus: string

  @Column({ name: 'work_done_summary', type: 'text', nullable: true })
  workDoneSummary: string

  @Column({ name: 'issues_faced', type: 'text', nullable: true })
  issuesFaced: string

  @Column({ name: 'next_day_plan', type: 'text', nullable: true })
  nextDayPlan: string

  @Column({ type: 'enum', enum: TimesheetStatus, default: TimesheetStatus.DRAFT })
  status: TimesheetStatus

  @Column({ name: 'approved_by', nullable: true })
  approvedBy: string

  @Column({ name: 'approved_at', nullable: true })
  approvedAt: Date

  @Column({ name: 'rejection_reason', nullable: true })
  rejectionReason: string


}