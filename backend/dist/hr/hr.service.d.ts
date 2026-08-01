import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Employee } from './employee.entity';
import { Timesheet } from './timesheet.entity';
import { Attendance } from './attendance.entity';
import { SalaryRecord } from './salary-record.entity';
import { LeaveRequest, LeaveStatus } from './leave-request.entity';
import { UsersService } from '../users/users.service';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';
import { GenerateSalaryDto } from './dto/generate-salary.dto';
import { ApplyLeaveDto } from './dto/apply-leave.dto';
export declare class HrService {
    private readonly empRepo;
    private readonly attRepo;
    private readonly salRepo;
    private readonly leaveRepo;
    private readonly tsRepo;
    private readonly config;
    private readonly usersService;
    private readonly log;
    constructor(empRepo: Repository<Employee>, attRepo: Repository<Attendance>, salRepo: Repository<SalaryRecord>, leaveRepo: Repository<LeaveRequest>, tsRepo: Repository<Timesheet>, config: ConfigService, usersService: UsersService);
    generateNextEmpCode(): Promise<string>;
    private nullifyEmptyDates;
    createEmployee(dto: any): Promise<Employee>;
    listEmployees(p: {
        department?: string;
        status?: string;
        search?: string;
        projectId?: string;
    }): Promise<Employee[]>;
    getEmployee(id: string): Promise<Employee>;
    updateEmployee(id: string, data: any): Promise<Employee>;
    markAttendance(dto: MarkAttendanceDto): Promise<Attendance>;
    bulkMarkAttendance(records: MarkAttendanceDto[]): Promise<{
        saved: number;
        errors: string[];
    }>;
    getAttendance(p: {
        employeeId?: string;
        date?: string;
        month?: number;
        year?: number;
        projectId?: string;
    }): Promise<Attendance[]>;
    getTodayAttendance(projectId?: string): Promise<{
        date: string;
        present: number;
        absent: number;
        halfDay: number;
        onLeave: number;
        total: number;
        records: Attendance[];
        absentEmployees: {
            id: string;
            empCode: string;
            name: string;
            designation: string;
        }[];
    }>;
    getMonthlyReport(employeeId: string, year: number, month: number): Promise<{
        records: Attendance[];
        summary: {
            present: number;
            absent: number;
            halfDay: number;
            onLeave: number;
            geoUnverified: number;
            workingDays: number;
        };
    }>;
    generateSalary(dto: GenerateSalaryDto, generatedBy: string): Promise<SalaryRecord>;
    listSalary(p: {
        employeeId?: string;
        month?: number;
        year?: number;
        status?: string;
    }): Promise<SalaryRecord[]>;
    approveSalary(id: string): Promise<SalaryRecord>;
    markPaid(id: string, paymentMode: string): Promise<SalaryRecord>;
    applyLeave(dto: ApplyLeaveDto): Promise<LeaveRequest>;
    listLeaves(p: {
        employeeId?: string;
        status?: string;
    }): Promise<LeaveRequest[]>;
    processLeave(id: string, status: LeaveStatus, approvedBy: string): Promise<LeaveRequest>;
    dashboard(projectId?: string): Promise<{
        totalEmployees: number;
        presentToday: number;
        absentToday: number;
        onLeaveToday: number;
        attendancePct: number;
        pendingLeaves: number;
        pendingSalaries: number;
    }>;
    submitTimesheet(data: {
        employeeId: string;
        date: string;
        projectId?: string;
        activities: any[];
        workDoneSummary?: string;
        issuesFaced?: string;
        nextDayPlan?: string;
        attendanceStatus?: string;
    }): Promise<Timesheet>;
    getTimesheets(p: {
        employeeId?: string;
        date?: string;
        month?: number;
        year?: number;
        projectId?: string;
        status?: string;
    }): Promise<Timesheet[]>;
    approveTimesheet(id: string, approvedBy: string): Promise<Timesheet>;
    rejectTimesheet(id: string, reason: string, approvedBy: string): Promise<Timesheet>;
    deleteEmployee(id: string): Promise<import("typeorm").DeleteResult>;
    private bucket;
    dailyManpower(projectId: string | undefined, date: string): Promise<{
        present: number;
        total: number;
        skilled: number;
        unskilled: number;
        supervisory: number;
        uncategorised: number;
        date: string;
    }>;
    manpowerRange(projectId: string | undefined, from: string, to: string): Promise<Record<string, {
        present: number;
        total: number;
        skilled: number;
        unskilled: number;
        supervisory: number;
        uncategorised: number;
    }>>;
}
