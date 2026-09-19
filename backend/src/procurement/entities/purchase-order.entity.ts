import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { MaterialRequisition } from './material-requisition.entity';
import { PurchaseOrderItem } from './purchase-order-item.entity';
import { GoodsReceiptNote } from './goods-receipt-note.entity';

export enum PurchaseOrderStatus {
  DRAFT = 'draft',
  ISSUED = 'issued',
  PARTIALLY_DELIVERED = 'partially_delivered',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('purchase_orders')
export class PurchaseOrder extends BaseEntity {
  @Column({ name: 'project_id' })
  projectId: string;

  @Column({ name: 'po_number', unique: true, length: 60 })
  poNumber: string;

  @Column({ name: 'requisition_id', nullable: true })
  requisitionId: string;

  @ManyToOne(() => MaterialRequisition, (req) => req.purchaseOrders, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'requisition_id' })
  requisition: MaterialRequisition;

  @Column({ name: 'vendor_id', nullable: true })
  vendorId?: string;

  @Column({ name: 'work_component', nullable: true, length: 255 })
  workComponent?: string;

  @Column({ name: 'vendor_name', length: 255 })
  vendorName: string;

  @Column({ name: 'vendor_contact_person', nullable: true, length: 120 })
  vendorContactPerson: string;

  @Column({ name: 'vendor_phone', nullable: true, length: 50 })
  vendorPhone: string;

  @Column({ name: 'vendor_email', nullable: true, length: 120 })
  vendorEmail: string;

  @Column({ name: 'vendor_gstin', nullable: true, length: 50 })
  vendorGstin: string;

  @Column({ name: 'vendor_address', type: 'text', nullable: true })
  vendorAddress: string;

  @Column({ name: 'billing_address', type: 'text', nullable: true })
  billingAddress: string;

  @Column({ name: 'shipping_address', type: 'text', nullable: true })
  shippingAddress: string;

  @Column({ name: 'order_date', type: 'date' })
  orderDate: string;

  @Column({ name: 'expected_delivery_date', type: 'date', nullable: true })
  expectedDeliveryDate: string;

  @Column({ name: 'payment_terms', type: 'text', nullable: true })
  paymentTerms: string;

  @Column({ name: 'delivery_terms', type: 'text', nullable: true })
  deliveryTerms: string;

  @Column({ name: 'subtotal_amount', type: 'decimal', precision: 15, scale: 2, default: 0 })
  subtotalAmount: number;

  @Column({ name: 'tax_amount', type: 'decimal', precision: 15, scale: 2, default: 0 })
  taxAmount: number;

  @Column({ name: 'freight_charges', type: 'decimal', precision: 15, scale: 2, default: 0 })
  freightCharges: number;

  @Column({ name: 'other_charges', type: 'decimal', precision: 15, scale: 2, default: 0 })
  otherCharges: number;

  @Column({ name: 'grand_total', type: 'decimal', precision: 15, scale: 2, default: 0 })
  grandTotal: number;

  @Column({ type: 'varchar', length: 40, default: PurchaseOrderStatus.DRAFT })
  status: PurchaseOrderStatus;

  @Column({ name: 'issued_by_id', nullable: true })
  issuedById: string;

  @Column({ name: 'issued_by_name', nullable: true, length: 120 })
  issuedByName: string;

  @Column({ name: 'approved_by_id', nullable: true })
  approvedById: string;

  @Column({ name: 'approved_by_name', nullable: true, length: 120 })
  approvedByName: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @OneToMany(() => PurchaseOrderItem, (item) => item.purchaseOrder, { cascade: true, eager: true })
  items: PurchaseOrderItem[];

  @OneToMany(() => GoodsReceiptNote, (grn) => grn.purchaseOrder)
  goodsReceiptNotes: GoodsReceiptNote[];
}
