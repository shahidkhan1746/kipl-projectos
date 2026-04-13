import { BaseEntity } from '../shared/entities/base.entity';
export declare enum ExpenseCategory {
    MATERIAL = "material",
    LABOUR = "labour",
    EQUIPMENT_HIRE = "equipment_hire",
    FUEL = "fuel",
    TRANSPORT = "transport",
    SITE_OFFICE = "site_office",
    SAFETY = "safety",
    TESTING = "testing",
    SUBCONTRACT = "subcontract",
    GOVERNMENT_FEE = "government_fee",
    STAFF_SALARY = "staff_salary",
    MISCELLANEOUS = "miscellaneous"
}
export declare enum ExpenseStatus {
    PENDING = "pending",
    APPROVED = "approved",
    PAID = "paid",
    REJECTED = "rejected"
}
export declare class Expense extends BaseEntity {
    projectId: string;
    vendorId: string;
    date: string;
    description: string;
    category: ExpenseCategory;
    billNo: string;
    billDate: string;
    grossAmount: number;
    gstPct: number;
    gstAmount: number;
    tdsPct: number;
    tdsAmount: number;
    netPayable: number;
    paidAmount: number;
    paymentDate: string;
    paymentMode: string;
    paymentRef: string;
    status: ExpenseStatus;
    approvedBy: string;
    remarks: string;
}
