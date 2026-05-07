import { BaseEntity } from '../shared/entities/base.entity';
export declare enum TaskStatus {
    NOT_STARTED = "not_started",
    IN_PROGRESS = "in_progress",
    COMPLETED = "completed",
    DELAYED = "delayed",
    ON_HOLD = "on_hold"
}
export declare enum TaskLevel {
    WBS1 = 1,
    WBS2 = 2,
    WBS3 = 3
}
export declare class WbsTask extends BaseEntity {
    projectId: string;
    wbsCode: string;
    title: string;
    description: string;
    level: number;
    parentId: string;
    sortOrder: number;
    plannedStart: string;
    plannedEnd: string;
    plannedDuration: number;
    actualStart: string;
    actualEnd: string;
    progressPct: number;
    status: TaskStatus;
    isMilestone: boolean;
    paymentMilestone: string;
    paymentPct: number;
    responsible: string;
    remarks: string;
    delayDays: number;
    delayReason: string;
    eotApplied: boolean;
    eotDays: number;
    predecessors: string;
    earliestStart: number;
    earliestFinish: number;
    latestStart: number;
    latestFinish: number;
    totalFloat: number;
    isCritical: boolean;
    optimisticDuration: number;
    mostLikelyDuration: number;
    pessimisticDuration: number;
    expectedDuration: number;
    variance: number;
    standardDeviation: number;
}
