import { WbsService } from './wbs.service';
export declare class WbsController {
    private readonly svc;
    constructor(svc: WbsService);
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
        contractEnd: string;
    }>;
    list(pid: string): Promise<import("./wbs-task.entity").WbsTask[]>;
    seed(pid: string): Promise<{
        seeded: number;
    }>;
    create(body: any): Promise<import("./wbs-task.entity").WbsTask>;
    update(id: string, body: any): Promise<import("./wbs-task.entity").WbsTask>;
}
