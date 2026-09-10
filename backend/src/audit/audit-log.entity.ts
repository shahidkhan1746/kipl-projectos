import { Entity, Column, Index } from 'typeorm'
import { BaseEntity } from '../shared/entities/base.entity'

@Entity('audit_logs')
export class AuditLog extends BaseEntity {
  @Index()
  @Column({ name: 'user_id', nullable: true })
  userId: string

  @Column({ nullable: true })
  email: string

  @Column({ nullable: true })
  role: string

  @Column({ length: 10 })
  method: string

  @Index()
  @Column()
  path: string

  @Column({ name: 'status_code', type: 'int', default: 0 })
  statusCode: number

  @Column({ type: 'text', nullable: true })
  summary: string
}
