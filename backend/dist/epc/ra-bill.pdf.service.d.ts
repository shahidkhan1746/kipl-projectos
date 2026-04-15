interface MilestoneState {
    id: string;
    label: string;
    stdPct: number;
    billedPct: number;
    checked: boolean;
}
interface ItemPayload {
    id: string;
    part: 'A' | 'B';
    sno: number;
    name: string;
    subName?: string;
    estimatedCost: number | null;
    estimatedQty: number | null;
    qtyUnit?: string;
    hasQty: boolean;
    state: {
        quotedCost: string;
        measuredQty: string;
        milestones: MilestoneState[];
        savedToBoq: boolean;
    };
    amount: number;
}
interface BillHeader {
    billNo: string;
    billDate: string;
    allotmentNo: string;
    allotmentDate: string;
    clientRef: string;
    remarks: string;
}
interface RaBillPayload {
    header: BillHeader;
    items: ItemPayload[];
}
export declare class RaBillPdfService {
    generate(payload: RaBillPayload): Promise<Buffer>;
}
export {};
