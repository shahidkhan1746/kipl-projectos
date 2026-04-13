import { BaseEntity } from '../shared/entities/base.entity';
export declare enum TdsSection {
    S194C = "194C",
    S194I = "194I",
    S194J = "194J",
    S194A = "194A",
    OTHER = "Other"
}
export declare enum TdsStatus {
    DEDUCTED = "deducted",
    DEPOSITED = "deposited"
}
export declare class TdsEntry extends BaseEntity {
    projectId: string;
    vendorId: string;
    refId: string;
    refType: string;
    date: string;
    payeeName: string;
    payeePan: string;
    section: TdsSection;
    grossAmount: number;
    tdsRate: number;
    tdsAmount: number;
    quarter: string;
    financialYear: string;
    status: TdsStatus;
    depositDate: string;
    challanNo: string;
}
