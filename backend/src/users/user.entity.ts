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

  @Column({ name: 'password_hash' })
  @Exclude()                         // never serialised in responses
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
}
