import { Repository } from 'typeorm';
import { BoqItem } from './boq-item.entity';
import { RaBill, RaBillStatus } from './ra-bill.entity';
import { Measurement } from './measurement.entity';
export declare class EpcService {
    private readonly boqRepo;
    private readonly raRepo;
    private readonly mbRepo;
    constructor(boqRepo: Repository<BoqItem>, raRepo: Repository<RaBill>, mbRepo: Repository<Measurement>);
    getPaymentMilestones(): {
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
    seedBoqItems(projectId: string, force?: boolean): Promise<{
        seeded: number;
    }>;
    listBoqItems(projectId: string, category?: string): Promise<BoqItem[]>;
    createBoqItem(data: Partial<BoqItem>): Promise<BoqItem>;
    updateBoqItem(id: string, data: Partial<BoqItem>): Promise<BoqItem>;
    updateMeasuredQty(id: string, measuredQty: number): Promise<BoqItem>;
    saveQuotedRateByCategory(projectId: string, category: string, subCategory: string, quotedAmount: number): Promise<void>;
    boqSummary(projectId: string): Promise<{
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
    createRaBill(data: Partial<RaBill>): Promise<RaBill>;
    deleteRaBill(id: string): Promise<{
        deleted: boolean;
    }>;
    updateRaBill(id: string, data: Partial<RaBill>): Promise<RaBill>;
    listRaBills(projectId: string): Promise<RaBill[]>;
    getRaBill(id: string): Promise<RaBill>;
    updateRaBillStatus(id: string, status: RaBillStatus, remarks?: string): Promise<RaBill>;
    addMeasurement(data: Partial<Measurement>): Promise<Measurement>;
    listMeasurements(p: {
        projectId?: string;
        boqItemId?: string;
        raBillId?: string;
    }): Promise<Measurement[]>;
}
