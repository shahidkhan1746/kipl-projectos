import { LeaveType } from '../leave-request.entity';
export declare class ApplyLeaveDto {
    employeeId: string;
    leaveType: LeaveType;
    fromDate: string;
    toDate: string;
    reason?: string;
}
