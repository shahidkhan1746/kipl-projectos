import { BaseEntity } from '../shared/entities/base.entity';
export declare enum NcrStatus {
    OPEN = "open",
    UNDER_REVIEW = "under_review",
    CLOSED = "closed",
    REJECTED = "rejected"
}
export declare enum NcrSeverity {
    MINOR = "minor",
    MAJOR = "major",
    CRITICAL = "critical"
}
export declare class Ncr extends BaseEntity {
    projectId: string;
    ncrNo: string;
    date: string;
    workItem: string;
    location: string;
    description: string;
    raisedBy: string;
    severity: NcrSeverity;
    status: NcrStatus;
    rootCause: string;
    correctiveAction: string;
    targetDate: string;
    closedDate: string;
    closedBy: string;
    inspectionId: string;
    remarks: string;
}
