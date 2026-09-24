import { Entity, Column, Index, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm'

@Entity('system_error_logs')
export class SystemLog {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Index()
  @Column({ length: 30, default: 'backend' })
  source: string // 'backend' | 'frontend' | 'mobile'

  @Index()
  @Column({ length: 20, default: 'error' })
  level: string // 'error' | 'warn' | 'fatal' | 'info'

  @Column({ name: 'error_name', length: 150, nullable: true })
  errorName: string

  @Column({ type: 'text' })
  message: string

  @Column({ type: 'text', nullable: true })
  stack: string

  @Column({ length: 500, nullable: true })
  path: string

  @Column({ length: 10, nullable: true })
  method: string

  @Index()
  @Column({ name: 'status_code', type: 'int', nullable: true })
  statusCode: number

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string

  @Column({ name: 'user_email', length: 255, nullable: true })
  userEmail: string

  @Column({ name: 'user_role', length: 50, nullable: true })
  userRole: string

  @Column({ name: 'ip_address', length: 100, nullable: true })
  ipAddress: string

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>

  @Column({ default: false })
  resolved: boolean

  @Index()
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date
}
