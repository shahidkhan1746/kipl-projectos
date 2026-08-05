import { BaseEntity } from '../shared/entities/base.entity';
export declare enum EmploymentType {
    FULL_TIME = "full_time",
    CONTRACT = "contract",
    DAILY_WAGE = "daily_wage"
}
export declare enum EmployeeStatus {
    ACTIVE = "active",
    INACTIVE = "inactive",
    TERMINATED = "terminated"
}
export declare class Employee extends BaseEntity {
    empCode: string;
    firstName: string;
    lastName: string;
    designation: string;
    labourCategory: string;
    department: string;
    phone: string;
    email: string;
    fatherName: string;
    address: string;
    bloodGroup: string;
    emergencyName: string;
    emergencyPhone: string;
    dateOfJoining: string;
    dateOfBirth: string;
    aadharNo: string;
    panNo: string;
    bankAccount: Record<string, string>;
    baseSalary: number;
    hra: number;
    allowances: number;
    employmentType: EmploymentType;
    status: EmployeeStatus;
    projectId: string;
    photoUrl: string;
}
