import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../shared/entities/base.entity';
import { User } from '../users/user.entity';
import { Project } from '../projects/project.entity';

export enum NotificationCategory {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
  SUCCESS = 'success',
}

@Entity('notifications')
export class Notification extends BaseEntity {
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  projectId: string | null;

  @ManyToOne(() => Project, { onDelete: 'SET NULL', nullable: true, eager: false })
  @JoinColumn({ name: 'project_id' })
  project: Project | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: NotificationCategory.INFO,
  })
  category: NotificationCategory | string;

  @Column({ type: 'varchar', length: 60 })
  type: string;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  link: string | null;

  @Column({ name: 'is_read', default: false })
  isRead: boolean;

  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt: Date | null;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;
}
