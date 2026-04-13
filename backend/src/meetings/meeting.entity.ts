import { Entity, Column } from 'typeorm'
import { BaseEntity } from '../shared/entities/base.entity'

export enum MeetingType {
  SITE_PROGRESS     = 'site_progress',
  COORDINATION      = 'coordination',
  SAFETY            = 'safety',
  DESIGN_REVIEW     = 'design_review',
  QUALITY           = 'quality',
  CLIENT_UEED       = 'client_ueed',
  LCMA              = 'lcma',
  INTERNAL          = 'internal',
}

export enum MeetingStatus { DRAFT = 'draft', CIRCULATED = 'circulated', CONFIRMED = 'confirmed' }

@Entity('meetings')
export class Meeting extends BaseEntity {
  @Column({ name: 'project_id' }) projectId: string
  @Column({ name: 'meeting_no' }) meetingNo: string
  @Column({ type: 'enum', enum: MeetingType, default: MeetingType.SITE_PROGRESS }) type: MeetingType
  @Column() title: string
  @Column({ type: 'date' }) date: string
  @Column({ nullable: true }) time: string
  @Column({ nullable: true }) venue: string
  @Column({ name: 'chaired_by', nullable: true }) chairedBy: string
  @Column({ name: 'minuted_by', nullable: true }) minutedBy: string

  // Attendees — jsonb array [{name, organisation, designation}]
  @Column({ type: 'jsonb', default: [] }) attendees: any[]

  // Agenda items — jsonb array [{item, discussion, decision, responsible, dueDate}]
  @Column({ type: 'jsonb', default: [] }) agendaItems: any[]

  // Action items — jsonb array [{action, responsible, dueDate, status, closedDate}]
  @Column({ name: 'action_items', type: 'jsonb', default: [] }) actionItems: any[]

  // Previous meeting action review
  @Column({ name: 'prev_meeting_id', nullable: true }) prevMeetingId: string
  @Column({ name: 'prev_actions_reviewed', default: false }) prevActionsReviewed: boolean

  @Column({ name: 'next_meeting_date', type: 'date', nullable: true }) nextMeetingDate: string
  @Column({ name: 'next_meeting_venue', nullable: true }) nextMeetingVenue: string

  @Column({ type: 'text', nullable: true }) remarks: string
  @Column({ type: 'enum', enum: MeetingStatus, default: MeetingStatus.DRAFT }) status: MeetingStatus
}
