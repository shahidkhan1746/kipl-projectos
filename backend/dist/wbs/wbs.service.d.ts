import { Repository } from 'typeorm';
import { WbsTask } from './wbs-task.entity';
export declare class WbsService {
    private repo;
    constructor(repo: Repository<WbsTask>);
    private daysFromStart;
    private addDays;
    seed(projectId: string, force?: boolean): Promise<{
        seeded: number;
    }>;
    list(projectId: string): Promise<WbsTask[]>;
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
            duration: number;
            es: number;
            ef: number;
            ls: number;
            lf: number;
            float: number;
            isCritical: boolean;
        }[];
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
