import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { PurchaseOrder } from './purchase-order.entity';

@Entity('purchase_order_items')
export class PurchaseOrderItem extends BaseEntity {
  @Column({ name: 'purchase_order_id' })
  purchaseOrderId: string;

  @ManyToOne(() => PurchaseOrder, (po) => po.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'purchase_order_id' })
  purchaseOrder: PurchaseOrder;

  @Column({ name: 'item_description', length: 255 })
  itemDescription: string;

  @Column({ name: 'hsn_code', nullable: true, length: 40 })
  hsnCode?: string;

  @Column({ type: 'decimal', precision: 12, scale: 3, default: 1 })
  quantity: number;

  @Column({ length: 40, default: 'Nos' })
  unit: string;

  @Column({ name: 'unit_rate', type: 'decimal', precision: 14, scale: 2, default: 0 })
  unitRate: number;

  @Column({ name: 'discount_percent', type: 'decimal', precision: 5, scale: 2, default: 0 })
  discountPercent: number;

  @Column({ name: 'gst_rate', type: 'decimal', precision: 5, scale: 2, default: 18 })
  gstRate: number;

  @Column({ name: 'taxable_amount', type: 'decimal', precision: 15, scale: 2, default: 0 })
  taxableAmount: number;

  @Column({ name: 'gst_amount', type: 'decimal', precision: 15, scale: 2, default: 0 })
  gstAmount: number;

  @Column({ name: 'total_amount', type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalAmount: number;

  @Column({ name: 'received_qty', type: 'decimal', precision: 12, scale: 3, default: 0 })
  receivedQty: number;
}
