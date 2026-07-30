import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from '../shared/entities/base.entity';
import { Project } from '../projects/project.entity';
import { User } from '../users/user.entity';

export enum LiaisonFileType {
  APPROVAL  = 'approval',
  NOC       = 'noc',
  DRAWING   = 'drawing',
  ESTIMATE  = 'estimate',
  REPORT    = 'report',
  LETTER    = 'letter',
  CLEARANCE = 'clearance',
  VETTING   = 'vetting',
  OTHER     = 'other',
}

export enum LiaisonStatus {
  DRAFT        = 'draft',
  SUBMITTED    = 'submitted',
  UNDER_REVIEW = 'under_review',
  APPROVED     = 'approved',
  REJECTED     = 'rejected',
  RETURNED     = 'returned',
  CLOSED       = 'closed',
}

export enum LiaisonPriority {
  LOW    = 'low',
  MEDIUM = 'medium',
  HIGH   = 'high',
  URGENT = 'urgent',
}

// Approval chain per file type — JE/AEE/XEN/SE are govt officer designations
export const APPROVAL_CHAINS: Record<LiaisonFileType, string[]> = {
  [LiaisonFileType.APPROVAL]:  ['JE', 'AEE', 'XEN', 'SE'],
  [LiaisonFileType.NOC]:       ['JE', 'AEE', 'XEN'],
  [LiaisonFileType.DRAWING]:   ['JE', 'XEN'],
  [LiaisonFileType.ESTIMATE]:  ['AEE', 'XEN', 'SE'],
  [LiaisonFileType.REPORT]:    ['XEN'],
  [LiaisonFileType.LETTER]:    ['XEN'],
  [LiaisonFileType.CLEARANCE]: ['JE', 'AEE', 'XEN', 'SE'],
  [LiaisonFileType.VETTING]:   ['AEE', 'XEN', 'SE'],   // technical vetting (e.g. NIT/IIT) → dept
  [LiaisonFileType.OTHER]:     ['JE', 'AEE', 'XEN', 'SE'],
};

@Entity('liaison_files')
export class LiaisonFile extends BaseEntity {
  @ManyToOne(() => Project, { eager: false })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ name: 'project_id' })
  projectId: string;

  // Auto-generated: KIPL/2026/LIA/0001
  @Column({ name: 'file_number', unique: true, nullable: true })
  fileNumber: string;

  @Column({ type: 'text' })
  subject: string;

  @Column({ name: 'file_type', type: 'enum', enum: LiaisonFileType })
  fileType: LiaisonFileType;

  @Column({ type: 'enum', enum: LiaisonPriority, default: LiaisonPriority.MEDIUM })
  priority: LiaisonPriority;

  @Column({ name: 'current_status', type: 'enum', enum: LiaisonStatus, default: LiaisonStatus.DRAFT })
  currentStatus: LiaisonStatus;

  // Who physically holds the file right now
  @ManyToOne(() => User, { nullable: true, eager: false })
  @JoinColumn({ name: 'current_holder_id' })
  currentHolder: User;

  @Column({ name: 'current_holder_id', nullable: true })
  currentHolderId: string;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'initiated_by' })
  initiatedBy: User;

  @Column({ name: 'initiated_by' })
  initiatedById: string;

  // Government department: LCMA, UEED, Forest Dept, Traffic Police, etc.
  @Column({ nullable: true })
  department: string;

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate: string;

  @Column({ type: 'text', nullable: true })
  remarks: string;

  // Which approval chain applies, stored for reference
  @Column({ name: 'approval_chain', type: 'jsonb', default: [] })
  approvalChain: string[];
}
