import { EmploymentType } from '../employee.entity';
export declare class CreateEmployeeDto {
    empCode: string;
    firstName: string;
    lastName?: string;
    designation?: string;
    labourCategory?: string;
    department?: string;
    phone?: string;
    email?: string;
    dateOfJoining?: string;
    dateOfBirth?: string;
    aadharNo?: string;
    panNo?: string;
    bankAccount?: Record<string, string>;
    baseSalary?: number;
    hra?: number;
    allowances?: number;
    employmentType?: EmploymentType;
    projectId?: string;
    createLogin?: boolean;
    loginEmail?: string;
    loginRole?: string;
    loginPassword?: string;
}
