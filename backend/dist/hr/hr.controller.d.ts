import { HrService } from './hr.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';
import { GenerateSalaryDto } from './dto/generate-salary.dto';
import { ApplyLeaveDto } from './dto/apply-leave.dto';
export declare class HrController {
    private readonly svc;
    constructor(svc: HrService);
    dashboard(projectId?: string): Promise<{
        totalEmployees: number;
        presentToday: number;
        absentToday: number;
        onLeaveToday: number;
        attendancePct: number;
        pendingLeaves: number;
        pendingSalaries: number;
    }>;
    nextEmpCode(): Promise<{
        code: string;
    }>;
    listEmployees(q: any): Promise<import("./employee.entity").Employee[]>;
    createEmployee(dto: CreateEmployeeDto): Promise<import("./employee.entity").Employee>;
    deleteEmployee(id: string): Promise<import("typeorm").DeleteResult>;
    getEmployee(id: string): Promise<import("./employee.entity").Employee>;
    updateEmployee(id: string, body: any): Promise<import("./employee.entity").Employee>;
    getAttendance(q: any): Promise<import("./attendance.entity").Attendance[]>;
    todayAttendance(projectId?: string): Promise<{
        date: string;
        present: number;
        absent: number;
        halfDay: number;
        onLeave: number;
        total: number;
        records: import("./attendance.entity").Attendance[];
        absentEmployees: {
            id: string;
            empCode: string;
            name: string;
            designation: string;
        }[];
    }>;
    markAttendance(dto: MarkAttendanceDto): Promise<import("./attendance.entity").Attendance>;
    bulkAttendance(body: {
        records: MarkAttendanceDto[];
    }): Promise<{
        saved: number;
        errors: string[];
    }>;
    monthlyReport(empId: string, year: string, month: string): Promise<{
        records: import("./attendance.entity").Attendance[];
        summary: {
            present: number;
            absent: number;
            halfDay: number;
            onLeave: number;
            geoUnverified: number;
            workingDays: number;
        };
    }>;
    listSalary(q: any): Promise<import("./salary-record.entity").SalaryRecord[]>;
    generateSalary(dto: GenerateSalaryDto, req: any): Promise<import("./salary-record.entity").SalaryRecord>;
    approveSalary(id: string): Promise<import("./salary-record.entity").SalaryRecord>;
    markPaid(id: string, pm: string): Promise<import("./salary-record.entity").SalaryRecord>;
    listLeaves(q: any): Promise<import("./leave-request.entity").LeaveRequest[]>;
    applyLeave(dto: ApplyLeaveDto): Promise<import("./leave-request.entity").LeaveRequest>;
    approveLeave(id: string, req: any): Promise<import("./leave-request.entity").LeaveRequest>;
    getTimesheets(q: any): Promise<import("./timesheet.entity").Timesheet[]>;
    submitTimesheet(body: any): Promise<import("./timesheet.entity").Timesheet>;
    approveTimesheet(id: string, req: any): Promise<import("./timesheet.entity").Timesheet>;
    rejectTimesheet(id: string, reason: string, req: any): Promise<import("./timesheet.entity").Timesheet>;
    rejectLeave(id: string, req: any): Promise<import("./leave-request.entity").LeaveRequest>;
}
