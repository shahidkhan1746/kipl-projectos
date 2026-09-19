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

  @OneToMany(() => GoodsReceiptNoteItem, (item) => item.goodsReceiptNote, { cascade: true, eager: true })
  items: GoodsReceiptNoteItem[];
}
