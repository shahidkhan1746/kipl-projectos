import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { MaterialRequisition } from './material-requisition.entity';

@Entity('requisition_items')
export class RequisitionItem extends BaseEntity {
  @Column({ name: 'requisition_id' })
  requisitionId: string;

  @ManyToOne(() => MaterialRequisition, (req) => req.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requisition_id' })
  requisition: MaterialRequisition;

  @Column({ name: 'item_description', length: 255 })
  itemDescription: string;

  @Column({ nullable: true, length: 80 })
  category: string;

  @Column({ type: 'decimal', precision: 12, scale: 3, default: 1 })
  quantity: number;

  @Column({ length: 40, default: 'Nos' })
  unit: string;

  @Column({ name: 'estimated_rate', type: 'decimal', precision: 14, scale: 2, default: 0 })
  estimatedRate: number;

  @Column({ name: 'estimated_amount', type: 'decimal', precision: 15, scale: 2, default: 0 })
  estimatedAmount: number;

  @Column({ type: 'text', nullable: true })
  specifications?: string;
}
