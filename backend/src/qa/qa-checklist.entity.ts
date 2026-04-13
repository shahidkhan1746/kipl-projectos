import { Entity, Column } from 'typeorm'
import { BaseEntity } from '../shared/entities/base.entity'

export enum ChecklistCategory {
  SEWER_NETWORK   = 'sewer_network',
  MANHOLE         = 'manhole',
  PIPE_LAYING     = 'pipe_laying',
  EARTHWORK       = 'earthwork',
  CONCRETE        = 'concrete',
  IPS_CIVIL       = 'ips_civil',
  IPS_EM          = 'ips_em',
  STP             = 'stp',
  ROAD_RESTORATION= 'road_restoration',
  TESTING         = 'testing',
  MATERIAL        = 'material',
  SAFETY          = 'safety',
}

@Entity('qa_checklists')
export class QaChecklist extends BaseEntity {
  @Column({ name:'project_id' }) projectId: string
  @Column() title: string
  @Column({ type:'enum', enum:ChecklistCategory }) category: ChecklistCategory
  @Column({ name:'work_item', nullable:true }) workItem: string
  @Column({ name:'is_template', default:false }) isTemplate: boolean
  @Column({ type:'jsonb', default:[] }) items: Array<{
    id: string
    question: string
    required: boolean
    referenceSpec?: string
  }>
  @Column({ name:'is_active', default:true }) isActive: boolean
}