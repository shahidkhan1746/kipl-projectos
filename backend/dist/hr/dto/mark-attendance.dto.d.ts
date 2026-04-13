import { AttendanceStatus, AttendanceSource } from '../attendance.entity';
export declare class MarkAttendanceDto {
    employeeId: string;
    date: string;
    status: AttendanceStatus;
    source?: AttendanceSource;
    checkInLat?: number;
    checkInLng?: number;
    checkInTime?: string;
    checkOutTime?: string;
    remarks?: string;
    projectId?: string;
}
