import { BaseEntity } from '../shared/entities/base.entity';
export declare enum AttendanceStatus {
    PRESENT = "present",
    ABSENT = "absent",
    HALF_DAY = "half_day",
    LEAVE = "leave",
    HOLIDAY = "holiday"
}
export declare enum AttendanceSource {
    MOBILE = "mobile",
    MANUAL = "manual",
    BIOMETRIC = "biometric"
}
export declare class Attendance extends BaseEntity {
    employeeId: string;
    projectId: string;
    date: string;
    checkInTime: Date;
    checkInLat: number;
    checkInLng: number;
    checkOutTime: Date;
    checkOutLat: number;
    checkOutLng: number;
    hoursWorked: number;
    geoVerified: boolean;
    distanceFromSite: number;
    status: AttendanceStatus;
    source: AttendanceSource;
    remarks: string;
}
