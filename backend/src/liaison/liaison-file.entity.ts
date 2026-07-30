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

  // ── Delay / EOT tracking ──────────────────────────────────────────────────
  // Expected date the approval/clearance should have been granted (SLA / target).
  @Column({ name: 'expected_date', type: 'date', nullable: true })
  expectedDate: string;

  // Date the file was actually approved / cleared / received back.
  @Column({ name: 'actual_date', type: 'date', nullable: true })
  actualDate: string;

  // Auto-computed: (actualDate ?? today) − expectedDate, floored at 0.
  @Column({ name: 'delay_days', type: 'int', default: 0 })
  delayDays: number;

  // Marks this delay as a ground for an Extension-of-Time claim.
  @Column({ name: 'is_eot_ground', default: false })
  isEotGround: boolean;

  @Column({ name: 'eot_reason', type: 'text', nullable: true })
  eotReason: string;

  // Which WBS task/milestone this approval gates, e.g. 'M1' or '4'.
  // A delay here pushes that task's earliest start in the CPM network.
  @Column({ name: 'linked_wbs_code', type: 'varchar', nullable: true })
  linkedWbsCode: string;

  @Column({ type: 'text', nullable: true })
  remarks: string;

  // Which approval chain applies, stored for reference
  @Column({ name: 'approval_chain', type: 'jsonb', default: [] })
  approvalChain: string[];
}
