import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../shared/entities/base.entity';
import { User } from '../users/user.entity';

export enum ProjectStatus {
  ACTIVE     = 'active',
  ON_HOLD    = 'on_hold',
  COMPLETED  = 'completed',
  CANCELLED  = 'cancelled',
}

@Entity('projects')
export class Project extends BaseEntity {
  @Column({ length: 200 })
  name: string;

  @Column({ unique: true, length: 30 })
  code: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  client: string;

  @Column({ nullable: true })
  location: string;

  @Column({ name: 'contract_value', type: 'decimal', precision: 15, scale: 2, nullable: true })
  contractValue: number;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate: string;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate: string;

  @Column({ type: 'enum', enum: ProjectStatus, default: ProjectStatus.ACTIVE })
  status: ProjectStatus;

  @Column({ name: 'progress_pct', type: 'decimal', precision: 5, scale: 2, default: 0 })
  progressPct: number;

  @ManyToOne(() => User, { nullable: true, eager: false })
  @JoinColumn({ name: 'manager_id' })
  manager: User;
}
