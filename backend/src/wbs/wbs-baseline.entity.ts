import { Entity, Column, Index } from 'typeorm'
import { BaseEntity } from '../shared/entities/base.entity'

/** One activity as it stood when the baseline was taken. */
export interface BaselineActivity {
  wbsCode: string
  title: string
  plannedDuration: number
  forecastStart: string | null
  forecastFinish: string | null
  isCritical: boolean
  totalFloat: number
  weight: number
}

/**
 * A frozen copy of the programme.
 *
 * Once a programme is accepted under Clause 17 it has to stay put: progress and
 * delay are measured against it, and a delay event can only be argued against
 * a baseline that did not already contain it. Planned dates on the activities
 * stay editable; a baseline never changes after it is taken.
 */
@Entity('wbs_baselines')
@Index(['projectId', 'createdAt'])
export class WbsBaseline extends BaseEntity {
  @Column({ name: 'project_id' }) projectId: string
  @Column() name: string
  @Column({ type: 'text', nullable: true }) notes: string | null
  @Column({ name: 'data_date', type: 'date' }) dataDate: string
  @Column({ name: 'contract_start', type: 'date' }) contractStart: string
  @Column({ name: 'contract_completion', type: 'date' }) contractCompletion: string
  @Column({ name: 'forecast_finish', type: 'date', nullable: true }) forecastFinish: string | null
  @Column({ name: 'created_by', type: 'varchar', nullable: true }) createdBy: string | null
  @Column({ type: 'jsonb', default: () => "'[]'" }) activities: BaselineActivity[]
}
