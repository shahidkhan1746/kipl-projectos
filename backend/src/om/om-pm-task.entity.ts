import { Entity, Column } from 'typeorm'
import { BaseEntity } from '../shared/entities/base.entity'

// A recurring preventive-maintenance task in the O&M schedule.
@Entity('om_pm_tasks')
export class OmPmTask extends BaseEntity {
  @Column({ name: 'project_id' }) projectId: string
  @Column() equipment: string
  @Column({ type: 'text' }) task: string
  @Column({ name: 'frequency_days', type: 'int', default: 30 }) frequencyDays: number
  @Column({ name: 'last_done', type: 'date', nullable: true }) lastDone: string
  @Column({ nullable: true }) responsible: string
  @Column({ type: 'text', nullable: true }) remarks: string
  @Column({ default: true }) active: boolean
}
