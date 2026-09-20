import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { PurchaseOrder } from './purchase-order.entity';
import { GoodsReceiptNoteItem } from './goods-receipt-note-item.entity';

@Entity('goods_receipt_notes')
export class GoodsReceiptNote extends BaseEntity {
  @Column({ name: 'project_id' })
  projectId: string;

  @Column({ name: 'grn_number', unique: true, length: 60 })
  grnNumber: string;

  @Column({ name: 'purchase_order_id' })
  purchaseOrderId: string;

  @ManyToOne(() => PurchaseOrder, (po) => po.goodsReceiptNotes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'purchase_order_id' })
  purchaseOrder: PurchaseOrder;

  @Column({ name: 'received_date', type: 'date' })
  receivedDate: string;

  @Column({ name: 'challan_number', nullable: true, length: 100 })
  challanNumber: string;

  @Column({ name: 'invoice_number', nullable: true, length: 100 })
  invoiceNumber: string;

  @Column({ name: 'vehicle_number', nullable: true, length: 50 })
  vehicleNumber: string;

  @Column({ name: 'received_by_id', nullable: true })
  receivedById: string;

  @Column({ name: 'received_by_name', nullable: true, length: 120 })
  receivedByName: string;

  @Column({ type: 'text', nullable: true })
  remarks: string;

  @Column({ name: 'write_to_material_register', default: true })
  writeToMaterialRegister: boolean;

  /**
   * When this receipt was reversed, and by whom.
   *
   * There was no way to correct one. The module had create and read and nothing
   * else, while poItem.receivedQty only ever incremented — so a delivery keyed
   * as 10,000 instead of 1,000 marked the order complete forever, inflated the
   * received value the three-way match reconciles against, and left stock in
   * the Clause 55 register that no longer matched the site.
   *
   * Reversed rather than deleted: a receipt that was signed for and later found
   * wrong is part of the record, and the correction is a second fact about it,
   * not the absence of the first.
   */
  @Column({ name: 'reversed_at', type: 'timestamptz', nullable: true })
  reversedAt: Date | null;

  @Column({ name: 'reversed_by_id', type: 'uuid', nullable: true })
  reversedById: string | null;

  @Column({ name: 'reversed_by_name', type: 'varchar', length: 255, nullable: true })
  reversedByName: string | null;

  @Column({ name: 'reversed_reason', type: 'text', nullable: true })
  reversedReason: string | null;

  @OneToMany(() => GoodsReceiptNoteItem, (item) => item.goodsReceiptNote, { cascade: true, eager: true })
  items: GoodsReceiptNoteItem[];
}
