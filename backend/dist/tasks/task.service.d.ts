import { Repository } from 'typeorm';
import { Task } from './task.entity';
export declare class TaskService {
    private repo;
    constructor(repo: Repository<Task>);
    create(data: any): Promise<any>;
    list(p: {
        projectId?: string;
        assignedTo?: string;
        status?: string;
        priority?: string;
    }): Promise<Task[]>;
    update(id: string, data: any): Promise<any>;
    addComment(id: string, comment: {
        author: string;
        text: string;
    }): Promise<any>;
    delete(id: string): Promise<void>;
    dashboard(projectId: string): Promise<{
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
}
