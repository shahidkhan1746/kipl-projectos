interface SubRow {
    breakup: string;
    pct: number;
    amount: number;
}
interface LineItemPayload {
    category: string;
    milestoneCode: string;
    milestoneName: string;
    description: string;
    parentDescription: string;
    workDone: string;
    estimatedCost: number;
    quotedRates: number;
    estimatedQtyKm: number;
    measuredQtyKm: number;
    paymentPct: number;
    billToRelease: number;
    workdoneAmount: number;
    subRows?: SubRow[];
}
interface BillHeader {
    billNo: string;
    billDate: string;
    allotmentNo: string;
    allotmentDate?: string;
    clientRef?: string;
    periodFrom?: string;
    periodTo?: string;
}
interface RaBillPayload {
    header: BillHeader;
    items: LineItemPayload[];
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
    remarks?: string;
}
export declare class RaBillPdfService {
    generate(payload: RaBillPayload): Promise<Buffer>;
}
export {};
