import { BaseEntity } from '../shared/entities/base.entity';
export declare enum TimesheetStatus {
    DRAFT = "draft",
    SUBMITTED = "submitted",
    APPROVED = "approved",
    REJECTED = "rejected"
}
export declare class Timesheet extends BaseEntity {
    employeeId: string;
    projectId: string;
    date: string;
    activities: Array<{
        time?: string;
        activity: string;
        location?: string;
        category?: string;
    }>;
    attendanceStatus: string;
    workDoneSummary: string;
    issuesFaced: string;
    nextDayPlan: string;
    status: TimesheetStatus;
    approvedBy: string;
    approvedAt: Date;
    rejectionReason: string;
}
