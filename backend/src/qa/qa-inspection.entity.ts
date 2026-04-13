import { Entity, Column } from 'typeorm'
import { BaseEntity } from '../shared/entities/base.entity'

export enum InspectionStatus {
  DRAFT     = 'draft',
  SUBMITTED = 'submitted',
  PASSED    = 'passed',
  FAILED    = 'failed',
  CONDITIONAL = 'conditional',
}

@Entity('qa_inspections')
export class QaInspection extends BaseEntity {
  @Column({ name:'project_id' }) projectId: string
  @Column({ name:'checklist_id', nullable:true }) checklistId: string
  @Column({ type:'date' }) date: string
  @Column({ name:'work_item' }) workItem: string
  @Column({ nullable:true }) location: string
  @Column({ nullable:true }) chainage: string
  @Column({ name:'inspected_by' }) inspectedBy: string
  @Column({ name:'contractor_rep', nullable:true }) contractorRep: string
  @Column({ name:'engineer_rep', nullable:true }) engineerRep: string
  @Column({ type:'jsonb', default:[] }) responses: Array<{
    itemId: string
    question: string
    result: 'pass' | 'fail' | 'na'
    remarks?: string
    photos?: string[]
  }>
  @Column({ name:'overall_result', type:'enum', enum:InspectionStatus, default:InspectionStatus.DRAFT }) overallResult: InspectionStatus
  @Column({ name:'pass_count', default:0 }) passCount: number
  @Column({ name:'fail_count', default:0 }) failCount: number
  @Column({ name:'na_count', default:0 }) naCount: number
  @Column({ type:'text', nullable:true }) remarks: string
  @Column({ name:'ncr_raised', default:false }) ncrRaised: boolean
  @Column({ name:'ncr_id', nullable:true }) ncrId: string
}