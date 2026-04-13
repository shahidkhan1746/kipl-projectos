import { Entity, Column } from 'typeorm'
import { BaseEntity } from '../shared/entities/base.entity'

@Entity('email_configs')
export class EmailConfig extends BaseEntity {
  @Column({ name: 'smtp_host',  default: 'smtp.gmail.com' }) smtpHost: string
  @Column({ name: 'smtp_port',  default: 587 }) smtpPort: number
  @Column({ name: 'smtp_secure', default: false }) smtpSecure: boolean
  @Column({ name: 'smtp_user'  }) smtpUser: string
  @Column({ name: 'smtp_pass',  type: 'text' }) smtpPass: string
  @Column({ name: 'from_name',  default: 'KIPL ProjectOS' }) fromName: string
  @Column({ name: 'from_email' }) fromEmail: string
  @Column({ name: 'is_active',  default: true }) isActive: boolean
  @Column({ name: 'is_verified', default: false }) isVerified: boolean
  @Column({ name: 'last_tested_at', nullable: true }) lastTestedAt: Date
}
