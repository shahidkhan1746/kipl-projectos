import { Repository } from 'typeorm';
import { QaChecklist } from './qa-checklist.entity';
import { QaInspection } from './qa-inspection.entity';
import { Ncr } from './ncr.entity';
export declare class QaService {
    private clRepo;
    private inRepo;
    private ncrRepo;
    constructor(clRepo: Repository<QaChecklist>, inRepo: Repository<QaInspection>, ncrRepo: Repository<Ncr>);
    seedChecklists(projectId: string): Promise<{
        seeded: number;
    }>;
    listChecklists(projectId: string, category?: string): Promise<QaChecklist[]>;
    createChecklist(data: Partial<QaChecklist>): Promise<QaChecklist>;
    getChecklist(id: string): Promise<QaChecklist>;
    createInspection(data: any): Promise<QaInspection>;
    listInspections(p: {
        projectId?: string;
        workItem?: string;
        result?: string;
        fromDate?: string;
        toDate?: string;
    }): Promise<QaInspection[]>;
    getInspection(id: string): Promise<QaInspection>;
    updateInspection(id: string, data: any): Promise<QaInspection>;
    createNcr(data: any): Promise<Ncr>;
    listNcrs(p: {
        projectId?: string;
        status?: string;
        severity?: string;
    }): Promise<Ncr[]>;
    closeNcr(id: string, data: {
        correctiveAction: string;
        closedBy: string;
    }): Promise<Ncr>;
    dashboard(projectId: string): Promise<{
        totalInspections: number;
        passed: number;
        failed: number;
        passRate: string;
        totalNcrs: number;
        openNcrs: number;
        critNcrs: number;
        closedNcrs: number;
    }>;
}
