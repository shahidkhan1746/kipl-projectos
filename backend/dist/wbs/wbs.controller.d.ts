import type { Response } from 'express';
import { WbsService } from './wbs.service';
import { WbsPdfService } from './wbs-pdf.service';
export declare class WbsController {
    private readonly svc;
    private readonly pdfSvc;
    constructor(svc: WbsService, pdfSvc: WbsPdfService);
    dashboard(pid: string): Promise<{
        totalTasks: number;
        completed: number;
        delayed: number;
        inProgress: number;
        overallProgress: string;
        milestones: number;
        milestonesHit: number;
        daysRemaining: number;
        contractPct: string;
        contractStart: string;
        contractEnd: string;
        criticalTasks: number;
        projectExpectedDuration: number;
        projectStdDeviation: number;
    }>;
    list(pid: string): Promise<import("./wbs-task.entity").WbsTask[]>;
    seed(body: {
        projectId: string;
        force?: boolean;
    }): Promise<{
        seeded: number;
    }>;
    addEnabling(pid: string): Promise<{
        added: number;
    }>;
    create(body: any): Promise<import("./wbs-task.entity").WbsTask>;
    update(id: string, body: any): Promise<import("./wbs-task.entity").WbsTask>;
    cpm(pid: string): Promise<{
        projectStart: string;
        projectEnd: string;
        criticalPath: {
            wbsCode: string;
            title: string;
            duration: number;
            earliestStart: number;
            earliestFinish: number;
            latestStart: number;
            latestFinish: number;
            totalFloat: number;
        }[];
        allTasks: {
            wbsCode: string;
            title: string;
            predecessors: string;
            dependencies: import("./wbs-task.entity").Dependency[];
            duration: number;
            es: number;
            ef: number;
            ls: number;
            lf: number;
            float: number;
            isCritical: boolean;
        }[];
    }>;
    pert(pid: string): Promise<{
        projectExpectedDuration: number;
        projectStdDeviation: number;
        projectVariance: number;
        probability68: {
            lower: number;
            upper: number;
        };
        probability95: {
            lower: number;
            upper: number;
        };
        probability99: {
            lower: number;
            upper: number;
        };
        tasks: {
            wbsCode: string;
            title: string;
            optimistic: number;
            mostLikely: number;
            pessimistic: number;
            expected: number;
            variance: number;
            stdDeviation: number;
            isCritical: boolean;
        }[];
    }>;
    eotRegister(pid: string): Promise<{
        approvalDelays: {
            source: "approval";
            ref: string;
            subject: string;
            department: string;
            expectedDate: string;
            actualDate: string;
            settled: boolean;
            delayDays: number;
            isEotGround: boolean;
            reason: string;
            linkedWbsCode: string;
            linkedTitle: string | null;
            criticalPathImpact: boolean;
        }[];
        taskDelays: {
            source: "task";
            ref: string;
            subject: string;
            responsible: string;
            delayDays: number;
            eotApplied: boolean;
            eotDays: number;
            reason: string;
            criticalPathImpact: boolean;
        }[];
        totals: {
            approvalDelayDays: number;
            taskDelayDays: number;
            claimableEotDays: number;
        };
        contractEnd: string;
    }>;
    recalculate(pid: string): Promise<{
        critical: string[];
        projectDuration: number;
    }>;
    ganttFullPdf(pid: string, res: Response): Promise<void>;
    ganttQuarterlyPdf(pid: string, res: Response): Promise<void>;
    progressReportPdf(pid: string, res: Response): Promise<void>;
}
