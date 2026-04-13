import { Entity, Column, CreateDateColumn } from 'typeorm'
import { BaseEntity } from '../shared/entities/base.entity'

export enum LeaveType { CASUAL='casual', EARNED='earned', SICK='sick', UNPAID='unpaid' }
export enum LeaveStatus { PENDING='pending', APPROVED='approved', REJECTED='rejected' }

@Entity('leave_requests')
export class LeaveRequest extends BaseEntity {
  @Column({ name: 'employee_id' }) employeeId: string
  @Column({ type: 'enum', enum: LeaveType }) leaveType: LeaveType
  @Column({ name: 'from_date', type: 'date' }) fromDate: string
  @Column({ name: 'to_date', type: 'date' }) toDate: string
  @Column({ type: 'text', nullable: true }) reason: string
  @Column({ type: 'enum', enum: LeaveStatus, default: LeaveStatus.PENDING }) status: LeaveStatus
  @Column({ name: 'approved_by', nullable: true }) approvedBy: string
  @Column({ name: 'approved_at', nullable: true }) approvedAt: Date
}