import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm'

@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ nullable: true })
  projectId: string

  @Column({ nullable: true })
  raNumber: string

  @Column({ type: 'date', nullable: true })
  billDate: string

  @Column({ type: 'date', nullable: true })
  periodFrom: string

  @Column({ type: 'date', nullable: true })
  periodTo: string

  // Cumulative RA-bill figures. thisBill (grossAmount) = grossToDate − previousBillAmount
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  grossToDate: number

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  previousBillAmount: number

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  grossAmount: number   // value of work in THIS bill

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 18 })
  gstPercent: number

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  gstAmount: number

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  mobilisationRecovery: number

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  securedAdvanceRecovery: number

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  ldPenalty: number

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  otherDeductions: number

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 2 })
  tdsPercent: number

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  tdsAmount: number

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 5 })
  retentionPercent: number

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  retentionAmount: number

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  netPayable: number

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  paidAmount: number

  @Column({ type: 'date', nullable: true })
  paidDate: string

  @Column({ default: 'draft' })
  status: string   // draft | submitted | approved | paid | rejected

  @Column({ type: 'text', nullable: true })
  remarks: string

  @Column({ nullable: true })
  createdBy: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
