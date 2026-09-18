import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { RequisitionItem } from './requisition-item.entity';
import { PurchaseOrder } from './purchase-order.entity';

export enum RequisitionStatus {
  DRAFT = 'draft',
  SUBMITTED_TO_HO = 'submitted_to_ho',
  PARTIALLY_APPROVED = 'partially_approved',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CONVERTED_TO_PO = 'converted_to_po',
  CANCELLED = 'cancelled',
}

export enum HoDepartmentApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum RequisitionPriority {
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Entity('material_requisitions')
export class MaterialRequisition extends BaseEntity {
  @Column({ name: 'project_id' })
  projectId: string;

  @Column({ name: 'req_number', unique: true, length: 60 })
  reqNumber: string;

  @Column({ length: 255 })
  title: string;

  @Column({ name: 'site_location', nullable: true, length: 255 })
  siteLocation: string;

  @Column({ name: 'requested_by_id', nullable: true })
  requestedById: string;

  @Column({ name: 'requested_by_name', nullable: true, length: 120 })
  requestedByName: string;

  @Column({ name: 'required_by_date', type: 'date', nullable: true })
  requiredByDate: string;

  @Column({ type: 'varchar', length: 30, default: RequisitionPriority.NORMAL })
  priority: RequisitionPriority;

  @Column({ type: 'text', nullable: true })
  justification: string;

  @Column({ name: 'attachment_url', type: 'text', nullable: true })
  attachmentUrl: string;

  @Column({ type: 'varchar', length: 40, default: RequisitionStatus.SUBMITTED_TO_HO })
  status: RequisitionStatus;

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

  @Column({ name: 'recommended_vendor', nullable: true, length: 255 })
  recommendedVendor: string;

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

  @Column({ name: 'budget_head', nullable: true, length: 120 })
  budgetHead: string;

  @Column({ name: 'estimated_total', type: 'decimal', precision: 15, scale: 2, default: 0 })
  estimatedTotal: number;

  @OneToMany(() => RequisitionItem, (item) => item.requisition, { cascade: true, eager: true })
  items: RequisitionItem[];

  @OneToMany(() => PurchaseOrder, (po) => po.requisition)
  purchaseOrders: PurchaseOrder[];
}
