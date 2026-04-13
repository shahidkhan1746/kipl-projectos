import { BaseEntity } from '../shared/entities/base.entity';
export declare enum TaskPriority {
    CRITICAL = "critical",
    HIGH = "high",
    MEDIUM = "medium",
    LOW = "low"
}
export declare enum TaskStatus {
    TODO = "todo",
    IN_PROGRESS = "in_progress",
    REVIEW = "review",
    DONE = "done",
    BLOCKED = "blocked"
}
export declare class Task extends BaseEntity {
    projectId: string;
    title: string;
    description: string;
    priority: TaskPriority;
    status: TaskStatus;
    assignedTo: string;
    assignedName: string;
    createdBy: string;
    dueDate: string;
    completedDate: string;
    wbsCode: string;
    wbsTitle: string;
    category: string;
    progressPct: number;
    comments: any[];
    sortOrder: number;
}
