import { Entity, Column, CreateDateColumn } from 'typeorm'
import { BaseEntity } from '../shared/entities/base.entity'

export enum EmploymentType { FULL_TIME = 'full_time', CONTRACT = 'contract', DAILY_WAGE = 'daily_wage' }
export enum EmployeeStatus { ACTIVE = 'active', INACTIVE = 'inactive', TERMINATED = 'terminated' }

@Entity('employees')
export class Employee extends BaseEntity {
  @Column({ name: 'emp_code', unique: true, length: 20 })
  empCode: string
  @Column({ name: 'first_name', length: 100 })
  firstName: string
  @Column({ name: 'last_name', nullable: true })
  lastName: string
  @Column({ nullable: true })
  designation: string
  // Site-labour bucket used to reconcile with the Site Diary headcount:
  // 'skilled' | 'unskilled' | 'supervisory'. Null = office/non-site staff.
  @Column({ name: 'labour_category', type: 'varchar', nullable: true })
  labourCategory: string
  @Column({ nullable: true })
  department: string
  @Column({ nullable: true })
  phone: string
  @Column({ nullable: true })
  email: string
  @Column({ name: 'blood_group', nullable: true })
  bloodGroup: string
  @Column({ name: 'emergency_name', nullable: true })
  emergencyName: string
  @Column({ name: 'emergency_phone', nullable: true })
  emergencyPhone: string
  @Column({ name: 'date_of_joining', type: 'date', nullable: true })
  dateOfJoining: string
  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth: string
  @Column({ name: 'aadhar_no', nullable: true })
  aadharNo: string
  @Column({ name: 'pan_no', nullable: true })
  panNo: string
  @Column({ name: 'bank_account', type: 'jsonb', default: {} })
  bankAccount: Record<string, string>
  @Column({ name: 'base_salary', type: 'decimal', precision: 10, scale: 2, default: 0 })
  baseSalary: number
  @Column({ name: 'hra', type: 'decimal', precision: 10, scale: 2, default: 0 })
  hra: number
  @Column({ name: 'allowances', type: 'decimal', precision: 10, scale: 2, default: 0 })
  allowances: number
  @Column({ name: 'employment_type', type: 'enum', enum: EmploymentType, default: EmploymentType.CONTRACT })
  employmentType: EmploymentType
  @Column({ type: 'enum', enum: EmployeeStatus, default: EmployeeStatus.ACTIVE })
  status: EmployeeStatus
  @Column({ name: 'project_id', nullable: true })
  projectId: string
  @Column({ name: 'photo_url', nullable: true })
  photoUrl: string
}