import { Entity, Column, CreateDateColumn } from 'typeorm'
import { BaseEntity } from '../shared/entities/base.entity'

@Entity('measurements')
export class Measurement extends BaseEntity {
  @Column({ name: 'project_id' }) projectId: string
  @Column({ name: 'boq_item_id' }) boqItemId: string
  @Column({ name: 'ra_bill_id', nullable: true }) raBillId: string
  @Column({ name: 'mb_no', nullable: true }) mbNo: string
  @Column({ name: 'mb_page', nullable: true }) mbPage: string
  @Column({ type: 'date' }) date: string
  @Column({ type: 'text' }) location: string
  @Column({ type: 'jsonb', default: [] }) entries: any[] // [{no,l,b,h,qty,remarks}]
  @Column({ type: 'decimal', precision: 15, scale: 3, default: 0 }) totalQty: number
  @Column({ name: 'measured_by', nullable: true }) measuredBy: string
  @Column({ name: 'checked_by', nullable: true }) checkedBy: string
  @Column({ type: 'text', nullable: true }) remarks: string
}