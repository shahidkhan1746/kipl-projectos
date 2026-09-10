import { Entity, Column, Index, Unique } from 'typeorm'
import { BaseEntity } from '../shared/entities/base.entity'

@Entity('compliance_records')
@Unique(['projectId', 'itemId'])
export class ComplianceRecord extends BaseEntity {
  @Index()
  @Column({ name: 'project_id' })
  projectId: string

  @Column({ name: 'item_id' })
  itemId: string

  @Column({ default: 'pending' })
  status: string

  @Column({ type: 'date', nullable: true })
  deadline: string

  @Column({ name: 'evidence_url', nullable: true })
  evidenceUrl: string

  @Column({ type: 'text', nullable: true })
  notes: string

  @Column({ name: 'updated_by', nullable: true })
  updatedBy: string
}
