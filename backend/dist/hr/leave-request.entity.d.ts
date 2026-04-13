import { BaseEntity } from '../shared/entities/base.entity';
export declare enum LeaveType {
    CASUAL = "casual",
    EARNED = "earned",
    SICK = "sick",
    UNPAID = "unpaid"
}
export declare enum LeaveStatus {
    PENDING = "pending",
    APPROVED = "approved",
    REJECTED = "rejected"
}
export declare class LeaveRequest extends BaseEntity {
    employeeId: string;
    leaveType: LeaveType;
    fromDate: string;
    toDate: string;
    reason: string;
    status: LeaveStatus;
    approvedBy: string;
    approvedAt: Date;
}
