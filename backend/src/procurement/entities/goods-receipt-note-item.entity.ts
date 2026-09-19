import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { GoodsReceiptNote } from './goods-receipt-note.entity';
import { PurchaseOrderItem } from './purchase-order-item.entity';

@Entity('goods_receipt_note_items')
export class GoodsReceiptNoteItem extends BaseEntity {
  @Column({ name: 'grn_id' })
  grnId: string;

  @ManyToOne(() => GoodsReceiptNote, (grn) => grn.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'grn_id' })
  goodsReceiptNote: GoodsReceiptNote;

  @Column({ name: 'purchase_order_item_id', nullable: true })
  purchaseOrderItemId?: string;

  @ManyToOne(() => PurchaseOrderItem, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'purchase_order_item_id' })
  purchaseOrderItem?: PurchaseOrderItem;

  @Column({ name: 'item_description', length: 255 })
  itemDescription: string;

  @Column({ name: 'received_qty', type: 'decimal', precision: 12, scale: 3, default: 0 })
  receivedQty: number;

  @Column({ length: 40, default: 'Nos' })
  unit: string;

  @Column({ type: 'text', nullable: true })
  remarks: string;
}
