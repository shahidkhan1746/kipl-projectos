import { Entity, Column, CreateDateColumn } from 'typeorm'
import { BaseEntity } from '../shared/entities/base.entity'

export enum SalaryStatus { DRAFT='draft', APPROVED='approved', PAID='paid' }

@Entity('salary_records')
export class SalaryRecord extends BaseEntity {
  @Column({ name: 'employee_id' }) employeeId: string
  @Column() month: number
  @Column() year: number
  @Column({ name: 'working_days', nullable: true }) workingDays: number
  @Column({ name: 'days_present', type: 'decimal', precision: 5, scale: 2, nullable: true }) daysPresent: number
  @Column({ name: 'days_absent', type: 'decimal', precision: 5, scale: 2, default: 0 }) daysAbsent: number
  @Column({ name: 'base_salary', type: 'decimal', precision: 10, scale: 2, default: 0 }) baseSalary: number
  @Column({ name: 'hra', type: 'decimal', precision: 10, scale: 2, default: 0 }) hra: number
  @Column({ name: 'allowances', type: 'decimal', precision: 10, scale: 2, default: 0 }) allowances: number
  @Column({ name: 'gross_salary', type: 'decimal', precision: 10, scale: 2, default: 0 }) grossSalary: number
  @Column({ name: 'pf_amount', type: 'decimal', precision: 10, scale: 2, default: 0 }) pfAmount: number
  @Column({ name: 'esi_amount', type: 'decimal', precision: 10, scale: 2, default: 0 }) esiAmount: number
  @Column({ name: 'tds_amount', type: 'decimal', precision: 10, scale: 2, default: 0 }) tdsAmount: number
  @Column({ name: 'other_deductions', type: 'decimal', precision: 10, scale: 2, default: 0 }) otherDeductions: number
  @Column({ name: 'net_salary', type: 'decimal', precision: 10, scale: 2, default: 0 }) netSalary: number
  @Column({ type: 'enum', enum: SalaryStatus, default: SalaryStatus.DRAFT }) status: SalaryStatus
  @Column({ name: 'paid_on', type: 'date', nullable: true }) paidOn: string
  @Column({ name: 'payment_mode', nullable: true }) paymentMode: string
  @Column({ name: 'approved_by', nullable: true }) approvedBy: string
}