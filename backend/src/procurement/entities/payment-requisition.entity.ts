import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { PaymentRequisitionItem } from './payment-requisition-item.entity';

export enum PaymentRequisitionStatus {
  DRAFT = 'draft',
  SUBMITTED_TO_HO = 'submitted_to_ho',
  PARTIALLY_APPROVED = 'partially_approved',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PAID = 'paid',
  CANCELLED = 'cancelled',
}

export enum HoDepartmentApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('payment_requisitions')
export class PaymentRequisition extends BaseEntity {
  @Column({ name: 'project_id' })
  projectId: string;

  @Column({ name: 'pr_number', unique: true, length: 60 })
  prNumber: string;

  @Column({ length: 255 })
  title: string;

  @Column({ name: 'pr_date', type: 'date' })
  prDate: string;

  @Column({ name: 'site_location', length: 255, default: '38.5 MLD STP Nishat Sgr.' })
  siteLocation: string;

  @Column({ name: 'requested_by_id', nullable: true })
  requestedById: string;

  @Column({ name: 'requested_by_name', nullable: true, length: 120 })
  requestedByName: string;

  @Column({ type: 'varchar', length: 40, default: PaymentRequisitionStatus.SUBMITTED_TO_HO })
  status: PaymentRequisitionStatus;

  // Running Financial Totals
  @Column({ name: 'total_order_cost', type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalOrderCost: number;

  @Column({ name: 'total_advance_paid', type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalAdvancePaid: number;

  @Column({ name: 'total_amount_to_pay', type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalAmountToPay: number;

  @Column({ name: 'total_balance', type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalBalance: number;

  // HO Procurement Review
  @Column({ name: 'procurement_status', type: 'varchar', length: 30, default: HoDepartmentApprovalStatus.PENDING })
  procurementStatus: HoDepartmentApprovalStatus;

  @Column({ name: 'procurement_approved_by_id', nullable: true })
  procurementApprovedById: string;

  @Column({ name: 'procurement_approved_by_name', nullable: true, length: 120 })
  procurementApprovedByName: string;

  @Column({ name: 'procurement_approved_at', type: 'timestamptz', nullable: true })
  procurementApprovedAt: Date;

  @Column({ name: 'procurement_remarks', type: 'text', nullable: true })
  procurementRemarks: string;

  // HO Accounts Review
  @Column({ name: 'accounts_status', type: 'varchar', length: 30, default: HoDepartmentApprovalStatus.PENDING })
  accountsStatus: HoDepartmentApprovalStatus;

  @Column({ name: 'accounts_approved_by_id', nullable: true })
  accountsApprovedById: string;

  @Column({ name: 'accounts_approved_by_name', nullable: true, length: 120 })
  accountsApprovedByName: string;

  @Column({ name: 'accounts_approved_at', type: 'timestamptz', nullable: true })
  accountsApprovedAt: Date;

  @Column({ name: 'accounts_remarks', type: 'text', nullable: true })
  accountsRemarks: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'attachment_url', type: 'text', nullable: true })
  attachmentUrl: string;

  @OneToMany(() => PaymentRequisitionItem, (item) => item.paymentRequisition, { cascade: true, eager: true })
  items: PaymentRequisitionItem[];
}
