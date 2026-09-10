import { Entity, Column, Index, Unique } from 'typeorm'
import { BaseEntity } from '../shared/entities/base.entity'

@Entity('jha_checks')
@Unique(['projectId', 'paramKey', 'itemId'])
export class JhaCheck extends BaseEntity {
  @Index()
  @Column({ name: 'project_id' })
  projectId: string

  @Column({ name: 'param_key' })
  paramKey: string

  @Column({ name: 'item_id' })
  itemId: string

  @Column({ default: false })
  checked: boolean

  @Column({ name: 'evidence_url', nullable: true })
  evidenceUrl: string

  @Column({ type: 'text', nullable: true })
  notes: string

  @Column({ name: 'updated_by', nullable: true })
  updatedBy: string
}
