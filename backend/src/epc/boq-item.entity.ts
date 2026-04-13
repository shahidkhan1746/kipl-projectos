import { Entity, Column, CreateDateColumn } from 'typeorm'
import { BaseEntity } from '../shared/entities/base.entity'

export enum BoqCategory {
  SEWER_NETWORK = 'sewer_network',
  IPS_CIVIL     = 'ips_civil',
  IPS_EM        = 'ips_em',
  STP_CIVIL     = 'stp_civil',
  STP_EM        = 'stp_em',
  RISING_MAIN   = 'rising_main',
  ROAD_WORK     = 'road_work',
  OTHER         = 'other',
}

@Entity('boq_items')
export class BoqItem extends BaseEntity {
  @Column({ name: 'project_id' })
  projectId: string

  @Column({ name: 'sl_no', nullable: true })
  slNo: string

  @Column({ name: 'sor_ref', nullable: true })
  sorRef: string

  @Column({ type: 'text' })
  description: string

  @Column({ nullable: true })
  unit: string

  @Column({ type: 'enum', enum: BoqCategory, default: BoqCategory.SEWER_NETWORK })
  category: BoqCategory

  @Column({ name: 'sub_category', nullable: true })
  subCategory: string

  @Column({ type: 'decimal', precision: 15, scale: 3, default: 0 })
  estimatedQty: number

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  rate: number

  @Column({ name: 'estimated_amount', type: 'decimal', precision: 15, scale: 2, default: 0 })
  estimatedAmount: number

  @Column({ name: 'quoted_rate', type: 'decimal', precision: 15, scale: 2, default: 0 })
  quotedRate: number

  @Column({ name: 'quoted_amount', type: 'decimal', precision: 15, scale: 2, default: 0 })
  quotedAmount: number

  @Column({ name: 'measured_qty', type: 'decimal', precision: 15, scale: 3, default: 0 })
  measuredQty: number

  @Column({ name: 'measured_amount', type: 'decimal', precision: 15, scale: 2, default: 0 })
  measuredAmount: number

  @Column({ name: 'payment_milestone', nullable: true })
  paymentMilestone: string

  @Column({ name: 'payment_pct', type: 'decimal', precision: 5, scale: 2, default: 0 })
  paymentPct: number

  @Column({ name: 'is_active', default: true })
  isActive: boolean

}