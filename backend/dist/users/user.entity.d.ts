import { BaseEntity } from '../shared/entities/base.entity';
export declare enum UserRole {
    SUPER_ADMIN = "super_admin",
    ADMIN = "admin",
    PROJECT_MANAGER = "project_manager",
    ENGINEER = "engineer",
    ACCOUNTS = "accounts",
    QA_ENGINEER = "qa_engineer",
    SUPERVISOR = "supervisor",
    HR_OFFICER = "hr_officer",
    LIAISON_OFFICER = "liaison_officer",
    ACCOUNTANT = "accountant",
    FIELD_STAFF = "field_staff",
    VIEWER = "viewer"
}
export declare class User extends BaseEntity {
    name: string;
    email: string;
    phone: string;
    passwordHash: string;
    role: UserRole;
    department: string;
    designation: string;
    avatarUrl: string;
    isActive: boolean;
    lastLoginAt: Date;
}
