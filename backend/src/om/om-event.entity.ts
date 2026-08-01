import { Entity, Column } from 'typeorm'
import { BaseEntity } from '../shared/entities/base.entity'

export enum OmEventType {
  BREAKDOWN  = 'breakdown',
  PREVENTIVE = 'preventive',   // scheduled preventive maintenance
  CORRECTIVE = 'corrective',
}
export enum OmEventStatus { OPEN = 'open', CLOSED = 'closed' }

// Contract: mechanical/electrical breakdown must be rectified within 48 hours;
// penalty Rs 15,000 per day beyond 48 hours (STP O&M scope).
export const BREAKDOWN_GRACE_HOURS = 48
export const BREAKDOWN_PENALTY_PER_DAY = 15000

@Entity('om_events')
export class OmEvent extends BaseEntity {
  @Column({ name: 'project_id' }) projectId: string
  @Column({ type: 'enum', enum: OmEventType, default: OmEventType.BREAKDOWN }) type: OmEventType
  @Column() equipment: string
  @Column({ name: 'start_at', type: 'timestamptz' }) startAt: Date
  @Column({ name: 'end_at', type: 'timestamptz', nullable: true }) endAt: Date
  @Column({ type: 'text', nullable: true }) cause: string
  @Column({ type: 'text', nullable: true }) action: string
  @Column({ type: 'enum', enum: OmEventStatus, default: OmEventStatus.OPEN }) status: OmEventStatus
  @Column({ name: 'attended_by', nullable: true }) attendedBy: string
  @Column({ type: 'text', nullable: true }) remarks: string
}
