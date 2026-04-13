import { Entity, Column } from 'typeorm'
import { BaseEntity } from '../shared/entities/base.entity'

export enum NcrStatus { OPEN='open', UNDER_REVIEW='under_review', CLOSED='closed', REJECTED='rejected' }
export enum NcrSeverity { MINOR='minor', MAJOR='major', CRITICAL='critical' }

@Entity('ncrs')
export class Ncr extends BaseEntity {
  @Column({ name:'project_id' }) projectId: string
  @Column({ name:'ncr_no' }) ncrNo: string
  @Column({ type:'date' }) date: string
  @Column({ name:'work_item' }) workItem: string
  @Column({ nullable:true }) location: string
  @Column({ type:'text' }) description: string
  @Column({ name:'raised_by' }) raisedBy: string
  @Column({ type:'enum', enum:NcrSeverity, default:NcrSeverity.MINOR }) severity: NcrSeverity
  @Column({ type:'enum', enum:NcrStatus, default:NcrStatus.OPEN }) status: NcrStatus
  @Column({ name:'root_cause', type:'text', nullable:true }) rootCause: string
  @Column({ name:'corrective_action', type:'text', nullable:true }) correctiveAction: string
  @Column({ name:'target_date', type:'date', nullable:true }) targetDate: string
  @Column({ name:'closed_date', type:'date', nullable:true }) closedDate: string
  @Column({ name:'closed_by', nullable:true }) closedBy: string
  @Column({ name:'inspection_id', nullable:true }) inspectionId: string
  @Column({ type:'text', nullable:true }) remarks: string
}