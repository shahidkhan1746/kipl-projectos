import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { PaymentRequisition } from './payment-requisition.entity';

@Entity('payment_requisition_items')
export class PaymentRequisitionItem extends BaseEntity {
  @Column({ name: 'payment_requisition_id' })
  paymentRequisitionId: string;

  @ManyToOne(() => PaymentRequisition, (pr) => pr.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'payment_requisition_id' })
  paymentRequisition: PaymentRequisition;

  @Column({ name: 'sr_no', default: 1 })
  srNo: number;

  @Column({ name: 'vendor_id', nullable: true })
  vendorId?: string;

  @Column({ name: 'vendor_name', length: 255 })
  vendorName: string;

  @Column({ length: 255 })
  description: string;

  @Column({ name: 'material_or_services', length: 50, default: 'Material' })
  materialOrServices: string;

  @Column({ name: 'is_msme', default: false })
  isMsme: boolean;

  @Column({ name: 'total_order_cost', type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalOrderCost: number;

  @Column({ name: 'advance_paid', type: 'decimal', precision: 15, scale: 2, default: 0 })
  advancePaid: number;

  @Column({ name: 'amount_to_pay', type: 'decimal', precision: 15, scale: 2, default: 0 })
  amountToPay: number;

  @Column({ name: 'balance_amount', type: 'decimal', precision: 15, scale: 2, default: 0 })
  balanceAmount: number;

  @Column({ name: 'site_location', length: 255, default: '38.5 MLD STP Nishat Sgr.' })
  siteLocation: string;

  @Column({ length: 255, default: 'Against Tax Invoice' })
  remark: string;

  @Column({ name: 'against_ref', nullable: true, length: 100 })
  againstRef?: string;

  @Column({ name: 'mode_of_payment', length: 50, default: 'RTGS' })
  modeOfPayment: string;
}
