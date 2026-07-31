import { Repository } from 'typeorm';
import { WbsTask, Dependency } from './wbs-task.entity';
import { LiaisonFile } from '../liaison/liaison-file.entity';
export declare class WbsService {
    private repo;
    private liaisonRepo;
    constructor(repo: Repository<WbsTask>, liaisonRepo: Repository<LiaisonFile>);
    private daysFromStart;
    private resolveDeps;
    private depsToString;
    private addDays;
    seed(projectId: string, force?: boolean): Promise<{
        seeded: number;
    }>;
    list(projectId: string): Promise<WbsTask[]>;
    addEnablingPhase(projectId: string): Promise<{
        added: number;
    }>;
    update(id: string, data: any): Promise<WbsTask>;
    create(data: any): Promise<WbsTask>;
    recalculate(projectId: string): Promise<{
        critical: string[];
        projectDuration: number;
    }>;
    dashboard(projectId: string): Promise<{
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
    getCPM(projectId: string): Promise<{
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
            dependencies: Dependency[];
            duration: number;
            es: number;
            ef: number;
            ls: number;
            lf: number;
            float: number;
            isCritical: boolean;
        }[];
    }>;
    getEotRegister(projectId: string): Promise<{
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
    getPERT(projectId: string): Promise<{
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
}
