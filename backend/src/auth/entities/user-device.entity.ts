import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { User } from '../../users/user.entity';

@Entity('user_devices')
@Index('idx_user_devices_lookup', ['userId', 'deviceId'], { unique: true })
export class UserDevice extends BaseEntity {
  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'device_id', length: 128 })
  deviceId: string;

  @Column({ name: 'device_name', length: 128 })
  deviceName: string;

  @Column({ name: 'device_fingerprint', length: 64 })
  deviceFingerprint: string;

  @Column({ name: 'ip_address', length: 64 })
  ipAddress: string;

  @Column({ length: 64 })
  subnet: string;

  @Column({ name: 'user_agent', type: 'text' })
  userAgent: string;

  @Column({ name: 'is_trusted', default: true })
  isTrusted: boolean;

  @Column({ name: 'trust_score', type: 'int', default: 100 })
  trustScore: number;

  @Column({ name: 'last_active_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  lastActiveAt: Date;

  @Column({ name: 'login_count', type: 'int', default: 1 })
  loginCount: number;
}
