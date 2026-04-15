import { EpcService } from './epc.service';
import { RaBillStatus } from './ra-bill.entity';
export declare class EpcController {
    private readonly svc;
    constructor(svc: EpcService);
    milestones(): {
        sewer_network: {
            code: string;
            name: string;
            pct: number;
        }[];
        manholes: {
            code: string;
            name: string;
            pct: number;
        }[];
        drop_arrangements: {
            code: string;
            name: string;
            pct: number;
        }[];
        masonry_chambers: {
            code: string;
            name: string;
            pct: number;
        }[];
        civil_turnkey: {
            code: string;
            name: string;
            pct: number;
        }[];
        electro_mechanical: {
            code: string;
            name: string;
            pct: number;
        }[];
        om_component: {
            code: string;
            name: string;
            pct: number;
        }[];
    };
    summary(pid: string): Promise<{
        totalEstimated: number;
        totalQuoted: number;
        totalMeasured: number;
        percentageComplete: string;
        totalBilled: number;
        balance: number;
        items: number;
        byCategory: Record<string, any>;
        raBills: number;
    }>;
    seedBoq(projectId: string): Promise<{
        seeded: number;
    }>;
    listBoq(pid: string, cat?: string): Promise<import("./boq-item.entity").BoqItem[]>;
    createBoq(body: any): Promise<import("./boq-item.entity").BoqItem>;
    updateBoq(id: string, body: any): Promise<import("./boq-item.entity").BoqItem>;
    measure(id: string, qty: number): Promise<import("./boq-item.entity").BoqItem>;
    listRa(pid: string): Promise<import("./ra-bill.entity").RaBill[]>;
    createRa(body: any): Promise<import("./ra-bill.entity").RaBill>;
    getRa(id: string): Promise<import("./ra-bill.entity").RaBill>;
    updateStatus(id: string, status: RaBillStatus, remarks?: string): Promise<import("./ra-bill.entity").RaBill>;
    listMb(q: any): Promise<import("./measurement.entity").Measurement[]>;
    addMb(body: any): Promise<import("./measurement.entity").Measurement>;
    saveQuotedRate(body: {
        projectId: string;
        category: string;
        subCategory: string;
        quotedAmount: number;
    }): Promise<void>;
}
