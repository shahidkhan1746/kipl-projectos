export declare class Invoice {
    id: string;
    projectId: string;
    raNumber: string;
    billDate: string;
    periodFrom: string;
    periodTo: string;
    grossAmount: number;
    tdsPercent: number;
    tdsAmount: number;
    retentionPercent: number;
    retentionAmount: number;
    netPayable: number;
    status: string;
    remarks: string;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}
