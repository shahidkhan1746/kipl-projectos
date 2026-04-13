import { Entity, Column } from 'typeorm'
import { BaseEntity } from '../shared/entities/base.entity'

export enum TaskStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED   = 'completed',
  DELAYED     = 'delayed',
  ON_HOLD     = 'on_hold',
}

export enum TaskLevel { WBS1 = 1, WBS2 = 2, WBS3 = 3 }

@Entity('wbs_tasks')
export class WbsTask extends BaseEntity {
  @Column({ name: 'project_id' }) projectId: string
  @Column({ name: 'wbs_code' }) wbsCode: string
  @Column() title: string
  @Column({ type: 'text', nullable: true }) description: string
  @Column({ default: 1 }) level: number
  @Column({ name: 'parent_id', nullable: true }) parentId: string
  @Column({ name: 'sort_order', default: 0 }) sortOrder: number

  // Schedule
  @Column({ name: 'planned_start', type: 'date' }) plannedStart: string
  @Column({ name: 'planned_end', type: 'date' }) plannedEnd: string
  @Column({ name: 'planned_duration', default: 0 }) plannedDuration: number
  @Column({ name: 'actual_start', type: 'date', nullable: true }) actualStart: string
  @Column({ name: 'actual_end', type: 'date', nullable: true }) actualEnd: string

  // Progress
  @Column({ name: 'progress_pct', type: 'decimal', precision: 5, scale: 1, default: 0 }) progressPct: number
  @Column({ type: 'enum', enum: TaskStatus, default: TaskStatus.NOT_STARTED }) status: TaskStatus

  // Milestones & payment
  @Column({ name: 'is_milestone', default: false }) isMilestone: boolean
  @Column({ name: 'payment_milestone', nullable: true }) paymentMilestone: string
  @Column({ name: 'payment_pct', type: 'decimal', precision: 5, scale: 2, default: 0 }) paymentPct: number

  // Responsibility
  @Column({ nullable: true }) responsible: string
  @Column({ nullable: true }) remarks: string

  // Delay tracking
  @Column({ name: 'delay_days', default: 0 }) delayDays: number
  @Column({ name: 'delay_reason', type: 'text', nullable: true }) delayReason: string
  @Column({ name: 'eot_applied', default: false }) eotApplied: boolean
  @Column({ name: 'eot_days', default: 0 }) eotDays: number
}
