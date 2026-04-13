import { BaseEntity } from '../shared/entities/base.entity';
export declare enum SalaryStatus {
    DRAFT = "draft",
    APPROVED = "approved",
    PAID = "paid"
}
export declare class SalaryRecord extends BaseEntity {
    employeeId: string;
    month: number;
    year: number;
    workingDays: number;
    daysPresent: number;
    daysAbsent: number;
    baseSalary: number;
    hra: number;
    allowances: number;
    grossSalary: number;
    pfAmount: number;
    esiAmount: number;
    tdsAmount: number;
    otherDeductions: number;
    netSalary: number;
    status: SalaryStatus;
    paidOn: string;
    paymentMode: string;
    approvedBy: string;
}
