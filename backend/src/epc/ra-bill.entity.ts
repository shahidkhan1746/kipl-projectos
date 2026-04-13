import { Entity, Column, CreateDateColumn } from 'typeorm'
import { BaseEntity } from '../shared/entities/base.entity'

export enum RaBillStatus {
  DRAFT     = 'draft',
  SUBMITTED = 'submitted',
  VERIFIED  = 'verified',
  APPROVED  = 'approved',
  PAID      = 'paid',
  REJECTED  = 'rejected',
}

@Entity('ra_bills')
export class RaBill extends BaseEntity {
  @Column({ name: 'project_id' })
  projectId: string

  @Column({ name: 'bill_no' })
  billNo: string

  @Column({ name: 'allotment_no', nullable: true })
  allotmentNo: string

  @Column({ name: 'bill_date', type: 'date' })
  billDate: string

  @Column({ name: 'period_from', type: 'date', nullable: true })
  periodFrom: string

  @Column({ name: 'period_to', type: 'date', nullable: true })
  periodTo: string

  // Array of line items: { boqItemId, description, unit, measuredQty, rate, amount, milestone, pct }
  @Column({ type: 'jsonb', default: [] })
  lineItems: any[]

  @Column({ name: 'gross_amount', type: 'decimal', precision: 15, scale: 2, default: 0 })
  grossAmount: number

  @Column({ name: 'prev_billed', type: 'decimal', precision: 15, scale: 2, default: 0 })
  prevBilled: number

  @Column({ name: 'net_this_bill', type: 'decimal', precision: 15, scale: 2, default: 0 })
  netThisBill: number

  @Column({ name: 'gst_pct', type: 'decimal', precision: 5, scale: 2, default: 0 })
  gstPct: number

  @Column({ name: 'gst_amount', type: 'decimal', precision: 15, scale: 2, default: 0 })
  gstAmount: number

  @Column({ name: 'tds_pct', type: 'decimal', precision: 5, scale: 2, default: 0 })
  tdsPct: number

  @Column({ name: 'tds_amount', type: 'decimal', precision: 15, scale: 2, default: 0 })
  tdsAmount: number

  @Column({ name: 'security_deposit_pct', type: 'decimal', precision: 5, scale: 2, default: 0 })
  securityDepositPct: number

  @Column({ name: 'security_deposit_amount', type: 'decimal', precision: 15, scale: 2, default: 0 })
  securityDepositAmount: number

  @Column({ name: 'net_payable', type: 'decimal', precision: 15, scale: 2, default: 0 })
  netPayable: number

  @Column({ name: 'amount_in_words', nullable: true })
  amountInWords: string

  @Column({ type: 'enum', enum: RaBillStatus, default: RaBillStatus.DRAFT })
  status: RaBillStatus

  @Column({ name: 'submitted_date', type: 'date', nullable: true })
  submittedDate: string

  @Column({ name: 'approved_date', type: 'date', nullable: true })
  approvedDate: string

  @Column({ name: 'paid_date', type: 'date', nullable: true })
  paidDate: string

  @Column({ name: 'remarks', type: 'text', nullable: true })
  remarks: string

}