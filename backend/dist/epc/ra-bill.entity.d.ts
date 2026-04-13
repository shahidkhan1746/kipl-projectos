import { BaseEntity } from '../shared/entities/base.entity';
export declare enum RaBillStatus {
    DRAFT = "draft",
    SUBMITTED = "submitted",
    VERIFIED = "verified",
    APPROVED = "approved",
    PAID = "paid",
    REJECTED = "rejected"
}
export declare class RaBill extends BaseEntity {
    projectId: string;
    billNo: string;
    allotmentNo: string;
    billDate: string;
    periodFrom: string;
    periodTo: string;
    lineItems: any[];
    grossAmount: number;
    prevBilled: number;
    netThisBill: number;
    gstPct: number;
    gstAmount: number;
    tdsPct: number;
    tdsAmount: number;
    securityDepositPct: number;
    securityDepositAmount: number;
    netPayable: number;
    amountInWords: string;
    status: RaBillStatus;
    submittedDate: string;
    approvedDate: string;
    paidDate: string;
    remarks: string;
}
