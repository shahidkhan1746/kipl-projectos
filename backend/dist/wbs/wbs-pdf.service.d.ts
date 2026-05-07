import { WbsTask } from './wbs-task.entity';
interface DashboardData {
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
}
export declare class WbsPdfService {
    private fmt;
    generateGanttFull(tasks: WbsTask[], dashboard: DashboardData): Promise<Buffer>;
    generateGanttQuarterly(tasks: WbsTask[], dashboard: DashboardData): Promise<Buffer>;
    generateProgressReport(tasks: WbsTask[], dashboard: DashboardData, cpm: any, pert: any): Promise<Buffer>;
}
export {};
