import { QaService } from './qa.service';
export declare class QaController {
    private readonly svc;
    constructor(svc: QaService);
    dashboard(pid: string): Promise<{
        totalInspections: number;
        passed: number;
        failed: number;
        passRate: string;
        totalNcrs: number;
        openNcrs: number;
        critNcrs: number;
        closedNcrs: number;
    }>;
    list(pid: string, cat?: string): Promise<import("./qa-checklist.entity").QaChecklist[]>;
    seed(pid: string): Promise<{
        seeded: number;
    }>;
    create(body: any): Promise<import("./qa-checklist.entity").QaChecklist>;
    getOne(id: string): Promise<import("./qa-checklist.entity").QaChecklist>;
    inspections(q: any): Promise<import("./qa-inspection.entity").QaInspection[]>;
    createInsp(body: any): Promise<import("./qa-inspection.entity").QaInspection>;
    getInsp(id: string): Promise<import("./qa-inspection.entity").QaInspection>;
    updateInsp(id: string, body: any): Promise<import("./qa-inspection.entity").QaInspection>;
    ncrs(q: any): Promise<import("./ncr.entity").Ncr[]>;
    createNcr(body: any): Promise<import("./ncr.entity").Ncr>;
    closeNcr(id: string, body: any, req: any): Promise<import("./ncr.entity").Ncr>;
}
