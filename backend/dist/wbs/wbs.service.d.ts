import { Repository } from 'typeorm';
import { WbsTask } from './wbs-task.entity';
export declare class WbsService {
    private repo;
    constructor(repo: Repository<WbsTask>);
    seed(projectId: string): Promise<{
        seeded: number;
    }>;
    list(projectId: string): Promise<WbsTask[]>;
    update(id: string, data: any): Promise<WbsTask>;
    create(data: any): Promise<WbsTask>;
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
        contractEnd: string;
    }>;
}
