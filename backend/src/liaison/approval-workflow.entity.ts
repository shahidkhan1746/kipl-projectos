import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../shared/entities/base.entity';
import { LiaisonFile } from './liaison-file.entity';
import { User } from '../users/user.entity';

export enum WorkflowStatus {
  PENDING  = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SKIPPED  = 'skipped',
}

@Entity('approval_workflows')
export class ApprovalWorkflow extends BaseEntity {
  @ManyToOne(() => LiaisonFile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'file_id' })
  file: LiaisonFile;

  @Column({ name: 'file_id' })
  fileId: string;

  @Column({ name: 'step_order' })
  stepOrder: number;

  // JE / AEE / XEN / SE
  @Column({ name: 'approver_role', length: 20 })
  approverRole: string;

  @ManyToOne(() => User, { nullable: true, eager: false })
  @JoinColumn({ name: 'approver_id' })
  approver: User;

  @Column({ name: 'approver_id', nullable: true })
  approverId: string;

  @Column({ type: 'enum', enum: WorkflowStatus, default: WorkflowStatus.PENDING })
  status: WorkflowStatus;

  @Column({ name: 'action_at', nullable: true })
  actionAt: Date;

  @Column({ type: 'text', nullable: true })
  remarks: string;
}
