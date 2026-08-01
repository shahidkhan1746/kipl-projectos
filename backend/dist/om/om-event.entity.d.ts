import { BaseEntity } from '../shared/entities/base.entity';
export declare enum OmEventType {
    BREAKDOWN = "breakdown",
    PREVENTIVE = "preventive",
    CORRECTIVE = "corrective"
}
export declare enum OmEventStatus {
    OPEN = "open",
    CLOSED = "closed"
}
export declare const BREAKDOWN_GRACE_HOURS = 48;
export declare const BREAKDOWN_PENALTY_PER_DAY = 15000;
export declare class OmEvent extends BaseEntity {
    projectId: string;
    type: OmEventType;
    equipment: string;
    startAt: Date;
    endAt: Date;
    cause: string;
    action: string;
    status: OmEventStatus;
    attendedBy: string;
    remarks: string;
}
