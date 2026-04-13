import { TaskService } from './task.service';
export declare class TaskController {
    private readonly svc;
    constructor(svc: TaskService);
    dashboard(pid: string): Promise<{
        total: number;
        todo: number;
        inProgress: number;
        review: number;
        done: number;
        blocked: number;
        overdue: number;
        critical: number;
        byAssignee: any;
    }>;
    list(q: any): Promise<import("./task.entity").Task[]>;
    create(body: any, req: any): Promise<any>;
    update(id: string, body: any): Promise<any>;
    comment(id: string, body: any, req: any): Promise<any>;
    delete(id: string): Promise<void>;
}
