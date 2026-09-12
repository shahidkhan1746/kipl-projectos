import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../shared/entities/base.entity';
import { Exclude } from 'class-transformer';

export enum UserRole {
  SUPER_ADMIN      = 'super_admin',
  ADMIN            = 'admin',
  PROJECT_MANAGER  = 'project_manager',
  ENGINEER    = 'engineer',
  ACCOUNTS    = 'accounts',
  QA_ENGINEER = 'qa_engineer',
  SUPERVISOR  = 'supervisor',
  HR_OFFICER       = 'hr_officer',
  LIAISON_OFFICER  = 'liaison_officer',
  ACCOUNTANT       = 'accountant',
  FIELD_STAFF      = 'field_staff',
  VIEWER           = 'viewer',
}

@Entity('users')
export class User extends BaseEntity {
  @Column({ length: 120 })
  name: string;

  @Column({ unique: true, length: 200 })
  email: string;

  @Column({ name: 'phone', nullable: true })
  phone: string;

  @Column({ name: 'password_hash', select: false })
  @Exclude()
  passwordHash: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.VIEWER })
  role: UserRole;

  @Column({ nullable: true })
  department: string;

  @Column({ nullable: true })
  designation: string;

  @Column({ name: 'avatar_url', nullable: true })
  avatarUrl: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'last_login_at', nullable: true })
  lastLoginAt: Date;

  @Column({ name: 'failed_login_count', type: 'int', default: 0 })
  failedLoginCount: number;

  // Column types below are stated, not inferred, and the three that follow all
  // need to be.
  //
  // TypeScript emits `Object` as the design-time type of a union, so a
  // `Date | null` property gives TypeORM nothing to map. It does not fall back
  // or warn — building the schema fails outright with
  // `Data type "Object" in "User.lockedUntil" is not supported`. Since
  // synchronize is on for every NODE_ENV that is not production, that killed a
  // local boot, a schema sync and any generated migration. It stayed invisible
  // only because production runs with synchronize off.
  //
  // The types are taken from what the database actually holds, not from what
  // TypeORM would have guessed. migrations/2026-09-10-hardening.sql created
  // these columns as timestamptz and varchar; left to infer from a plain `Date`
  // TypeORM would have said `timestamp without time zone`, and a dev sync would
  // then keep trying to convert a column production has as timestamptz.
  @Column({ name: 'locked_until', type: 'timestamptz', nullable: true })
  lockedUntil: Date | null;

  @Column({ name: 'password_reset_hash', type: 'varchar', nullable: true })
  @Exclude()
  passwordResetHash: string | null;

  @Column({ name: 'password_reset_expires', type: 'timestamptz', nullable: true })
  passwordResetExpires: Date | null;
}
