import { Entity, Column } from 'typeorm'
import { BaseEntity } from '../../shared/entities/base.entity'

@Entity('wbs_baselines')
export class WbsBaseline extends BaseEntity {
  @Column({ name: 'project_id' })
  projectId: string

  @Column()
  name: string

  @Column({ type: 'text', nullable: true })
  description?: string

  @Column({ name: 'baseline_date', type: 'date' })
  baselineDate: string

  @Column({ name: 'is_approved', default: false })
  isApproved: boolean

  @Column({ name: 'is_active', default: false })
  isActive: boolean

  @Column({ name: 'total_tasks', default: 0 })
  totalTasks: number

  @Column({ name: 'project_duration_days', default: 912 })
  projectDurationDays: number
}

@Entity('wbs_baseline_tasks')
export class WbsBaselineTask extends BaseEntity {
  @Column({ name: 'baseline_id' })
  baselineId: string

  @Column({ name: 'wbs_code' })
  wbsCode: string

  @Column()
  title: string

  @Column({ name: 'planned_start', type: 'date' })
  plannedStart: string

  @Column({ name: 'planned_end', type: 'date' })
  plannedEnd: string

  @Column({ name: 'planned_duration', default: 0 })
  plannedDuration: number

  @Column({ name: 'payment_pct', type: 'decimal', precision: 5, scale: 2, default: 0 })
  paymentPct: number

  @Column({ name: 'early_start', type: 'int', default: 0 })
  earlyStart: number

  @Column({ name: 'early_finish', type: 'int', default: 0 })
  earlyFinish: number

  @Column({ name: 'late_start', type: 'int', default: 0 })
  lateStart: number

  @Column({ name: 'late_finish', type: 'int', default: 0 })
  lateFinish: number

  @Column({ name: 'total_float', type: 'int', default: 0 })
  totalFloat: number

  @Column({ name: 'is_critical', default: false })
  isCritical: boolean

  @Column({ name: 'dependencies', type: 'jsonb', default: () => "'[]'" })
  dependencies: any[]
}
