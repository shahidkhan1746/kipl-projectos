import { BaseEntity } from '../shared/entities/base.entity';
export declare enum TxnType {
    RECEIPT = "receipt",
    PAYMENT = "payment",
    JOURNAL = "journal"
}
export declare class Transaction extends BaseEntity {
    projectId: string;
    date: string;
    type: TxnType;
    description: string;
    refNo: string;
    refType: string;
    refId: string;
    vendorId: string;
    debit: number;
    credit: number;
    balance: number;
    paymentMode: string;
    bankRef: string;
    narration: string;
}
