"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var HrService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HrService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const config_1 = require("@nestjs/config");
const employee_entity_1 = require("./employee.entity");
const timesheet_entity_1 = require("./timesheet.entity");
const attendance_entity_1 = require("./attendance.entity");
const salary_record_entity_1 = require("./salary-record.entity");
const leave_request_entity_1 = require("./leave-request.entity");
const users_service_1 = require("../users/users.service");
function gpsDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const toR = (d) => (d * Math.PI) / 180;
    const dLat = toR(lat2 - lat1);
    const dLng = toR(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toR(lat1)) * Math.cos(toR(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function workingDaysInMonth(year, month) {
    const days = new Date(year, month, 0).getDate();
    let count = 0;
    for (let d = 1; d <= days; d++) {
        if (new Date(year, month - 1, d).getDay() !== 0)
            count++;
    }
    return count;
}
let HrService = HrService_1 = class HrService {
    empRepo;
    attRepo;
    salRepo;
    leaveRepo;
    tsRepo;
    config;
    usersService;
    log = new common_1.Logger(HrService_1.name);
    constructor(empRepo, attRepo, salRepo, leaveRepo, tsRepo, config, usersService) {
        this.empRepo = empRepo;
        this.attRepo = attRepo;
        this.salRepo = salRepo;
        this.leaveRepo = leaveRepo;
        this.tsRepo = tsRepo;
        this.config = config;
        this.usersService = usersService;
    }
    async generateNextEmpCode() {
        const last = await this.empRepo
            .createQueryBuilder('e')
            .where("e.empCode LIKE 'KIPL-%'")
            .orderBy('e.createdAt', 'DESC')
            .getOne();
        if (!last)
            return 'KIPL-001';
        const num = parseInt(last.empCode.replace('KIPL-', '')) || 0;
        return 'KIPL-' + String(num + 1).padStart(3, '0');
    }
    async createEmployee(dto) {
        if (!dto.empCode)
            dto.empCode = await this.generateNextEmpCode();
        const exists = await this.empRepo.findOne({ where: { empCode: dto.empCode } });
        if (exists)
            throw new common_1.ConflictException('Employee code already exists');
        const { createLogin, loginEmail, loginRole, loginPassword, ...empData } = dto;
        const employee = await this.empRepo.save(this.empRepo.create(empData));
        if (createLogin && loginEmail && loginPassword) {
            try {
                await this.usersService.createUser({
                    name: (empData.firstName + ' ' + (empData.lastName ?? '')).trim(),
                    email: loginEmail,
                    role: loginRole ?? 'engineer',
                    password: loginPassword,
                });
            }
            catch (e) {
                console.warn('User creation failed for employee:', loginEmail, e.message);
            }
        }
        return employee;
    }
    async listEmployees(p) {
        const qb = this.empRepo.createQueryBuilder('e').orderBy('e.createdAt', 'DESC');
        if (p.department)
            qb.andWhere('e.department = :dept', { dept: p.department });
        if (p.status)
            qb.andWhere('e.status = :status', { status: p.status });
        if (p.projectId)
            qb.andWhere('e.projectId = :pid', { pid: p.projectId });
        if (p.search)
            qb.andWhere('(e.firstName ILIKE :s OR e.lastName ILIKE :s OR e.empCode ILIKE :s)', { s: '%' + p.search + '%' });
        return qb.getMany();
    }
    async getEmployee(id) {
        const emp = await this.empRepo.findOne({ where: { id } });
        if (!emp)
            throw new common_1.NotFoundException('Employee not found');
        return emp;
    }
    async updateEmployee(id, data) {
        await this.empRepo.update(id, data);
        return this.getEmployee(id);
    }
    async markAttendance(dto) {
        const existing = await this.attRepo.findOne({ where: { employeeId: dto.employeeId, date: dto.date } });
        let geoVerified = false;
        let distanceFromSite;
        const SITE_LAT = 34.0920;
        const SITE_LNG = 74.8740;
        const GEO_RADIUS = parseInt(this.config.get('GEO_FENCE_RADIUS') ?? '500');
        if (dto.checkInLat && dto.checkInLng) {
            distanceFromSite = Math.round(gpsDistance(dto.checkInLat, dto.checkInLng, SITE_LAT, SITE_LNG));
            geoVerified = distanceFromSite <= GEO_RADIUS;
        }
        const record = this.attRepo.create({
            employeeId: dto.employeeId, date: dto.date, status: dto.status,
            source: dto.source ?? attendance_entity_1.AttendanceSource.MANUAL, projectId: dto.projectId,
            checkInLat: dto.checkInLat, checkInLng: dto.checkInLng,
            checkInTime: dto.checkInTime ? new Date(dto.checkInTime) : new Date(),
            checkOutTime: dto.checkOutTime ? new Date(dto.checkOutTime) : undefined,
            geoVerified, distanceFromSite, remarks: dto.remarks,
        });
        if (existing) {
            await this.attRepo.update(existing.id, record);
            return this.attRepo.findOne({ where: { id: existing.id } });
        }
        return this.attRepo.save(record);
    }
    async bulkMarkAttendance(records) {
        let saved = 0;
        const errors = [];
        for (const r of records) {
            try {
                await this.markAttendance(r);
                saved++;
            }
            catch (e) {
                errors.push(r.employeeId + ': ' + e.message);
            }
        }
        return { saved, errors };
    }
    async getAttendance(p) {
        const qb = this.attRepo.createQueryBuilder('a').orderBy('a.date', 'DESC');
        if (p.employeeId)
            qb.andWhere('a.employeeId = :eid', { eid: p.employeeId });
        if (p.date)
            qb.andWhere('a.date = :date', { date: p.date });
        if (p.projectId)
            qb.andWhere('a.projectId = :pid', { pid: p.projectId });
        if (p.month && p.year)
            qb.andWhere('EXTRACT(MONTH FROM a.date) = :m AND EXTRACT(YEAR FROM a.date) = :y', { m: p.month, y: p.year });
        return qb.getMany();
    }
    async getTodayAttendance(projectId) {
        const today = new Date().toISOString().split('T')[0];
        const records = await this.getAttendance({ date: today, projectId });
        const allEmp = await this.empRepo.find({ where: { status: employee_entity_1.EmployeeStatus.ACTIVE, ...(projectId ? { projectId } : {}) } });
        const markedIds = records.map(r => r.employeeId);
        const absent = allEmp.filter(e => !markedIds.includes(e.id));
        return {
            date: today,
            present: records.filter(r => r.status === attendance_entity_1.AttendanceStatus.PRESENT).length,
            absent: absent.length,
            halfDay: records.filter(r => r.status === attendance_entity_1.AttendanceStatus.HALF_DAY).length,
            onLeave: records.filter(r => r.status === attendance_entity_1.AttendanceStatus.LEAVE).length,
            total: allEmp.length,
            records,
            absentEmployees: absent.map(e => ({ id: e.id, empCode: e.empCode, name: (e.firstName + ' ' + (e.lastName ?? '')).trim(), designation: e.designation })),
        };
    }
    async getMonthlyReport(employeeId, year, month) {
        const records = await this.getAttendance({ employeeId, month, year });
        return {
            records,
            summary: {
                present: records.filter(r => r.status === attendance_entity_1.AttendanceStatus.PRESENT).length,
                absent: records.filter(r => r.status === attendance_entity_1.AttendanceStatus.ABSENT).length,
                halfDay: records.filter(r => r.status === attendance_entity_1.AttendanceStatus.HALF_DAY).length,
                onLeave: records.filter(r => r.status === attendance_entity_1.AttendanceStatus.LEAVE).length,
                geoUnverified: records.filter(r => !r.geoVerified && r.status === attendance_entity_1.AttendanceStatus.PRESENT).length,
                workingDays: workingDaysInMonth(year, month),
            },
        };
    }
    async generateSalary(dto, generatedBy) {
        const existing = await this.salRepo.findOne({ where: { employeeId: dto.employeeId, month: dto.month, year: dto.year } });
        if (existing)
            throw new common_1.ConflictException('Salary already generated for this month');
        const emp = await this.getEmployee(dto.employeeId);
        const { summary } = await this.getMonthlyReport(dto.employeeId, dto.year, dto.month);
        const workingDays = summary.workingDays;
        const daysPresent = summary.present + (summary.halfDay * 0.5);
        const perDay = Number(emp.baseSalary) / workingDays;
        const earnedBasic = perDay * daysPresent;
        const earnedHra = (Number(emp.hra) / workingDays) * daysPresent;
        const allowances = Number(emp.allowances);
        const gross = earnedBasic + earnedHra + allowances;
        const PF_RATE = parseFloat(this.config.get('PF_RATE') ?? '0.12');
        const pfAmount = Math.min(Number(emp.baseSalary), 15000) * PF_RATE;
        const ESI_THRESHOLD = parseFloat(this.config.get('ESI_THRESHOLD') ?? '21000');
        const ESI_RATE = parseFloat(this.config.get('ESI_RATE') ?? '0.0075');
        const esiAmount = gross <= ESI_THRESHOLD ? gross * ESI_RATE : 0;
        const netSalary = gross - pfAmount - esiAmount;
        return this.salRepo.save(this.salRepo.create({
            employeeId: dto.employeeId, month: dto.month, year: dto.year,
            workingDays, daysPresent, daysAbsent: workingDays - daysPresent,
            baseSalary: +earnedBasic.toFixed(2), hra: +earnedHra.toFixed(2), allowances,
            grossSalary: +gross.toFixed(2), pfAmount: +pfAmount.toFixed(2),
            esiAmount: +esiAmount.toFixed(2), tdsAmount: 0, otherDeductions: 0,
            netSalary: +netSalary.toFixed(2), status: salary_record_entity_1.SalaryStatus.DRAFT, approvedBy: generatedBy,
        }));
    }
    async listSalary(p) {
        const qb = this.salRepo.createQueryBuilder('s').orderBy('s.year', 'DESC').addOrderBy('s.month', 'DESC');
        if (p.employeeId)
            qb.andWhere('s.employeeId = :eid', { eid: p.employeeId });
        if (p.month)
            qb.andWhere('s.month = :m', { m: p.month });
        if (p.year)
            qb.andWhere('s.year = :y', { y: p.year });
        if (p.status)
            qb.andWhere('s.status = :s', { s: p.status });
        return qb.getMany();
    }
    async approveSalary(id) {
        await this.salRepo.update(id, { status: salary_record_entity_1.SalaryStatus.APPROVED });
        const rec = await this.salRepo.findOne({ where: { id } });
        if (!rec)
            throw new common_1.NotFoundException('Not found');
        return rec;
    }
    async markPaid(id, paymentMode) {
        await this.salRepo.update(id, { status: salary_record_entity_1.SalaryStatus.PAID, paidOn: new Date().toISOString().split('T')[0], paymentMode });
        const rec = await this.salRepo.findOne({ where: { id } });
        if (!rec)
            throw new common_1.NotFoundException('Not found');
        return rec;
    }
    async applyLeave(dto) {
        return this.leaveRepo.save(this.leaveRepo.create(dto));
    }
    async listLeaves(p) {
        const qb = this.leaveRepo.createQueryBuilder('l').orderBy('l.createdAt', 'DESC');
        if (p.employeeId)
            qb.andWhere('l.employeeId = :eid', { eid: p.employeeId });
        if (p.status)
            qb.andWhere('l.status = :s', { s: p.status });
        return qb.getMany();
    }
    async processLeave(id, status, approvedBy) {
        await this.leaveRepo.update(id, { status, approvedBy, approvedAt: new Date() });
        const leave = await this.leaveRepo.findOne({ where: { id } });
        if (!leave)
            throw new common_1.NotFoundException('Not found');
        return leave;
    }
    async dashboard(projectId) {
        const empFilter = { status: employee_entity_1.EmployeeStatus.ACTIVE };
        if (projectId)
            empFilter.projectId = projectId;
        const totalEmp = await this.empRepo.count({ where: empFilter });
        const today = await this.getTodayAttendance(projectId);
        const pendingLeaves = await this.leaveRepo.count({ where: { status: leave_request_entity_1.LeaveStatus.PENDING } });
        const pendingSalaries = await this.salRepo.count({ where: { status: salary_record_entity_1.SalaryStatus.DRAFT } });
        return {
            totalEmployees: totalEmp,
            presentToday: today.present,
            absentToday: today.absent,
            onLeaveToday: today.onLeave,
            attendancePct: totalEmp > 0 ? Math.round((today.present / totalEmp) * 100) : 0,
            pendingLeaves,
            pendingSalaries,
        };
    }
    async submitTimesheet(data) {
        const existing = await this.tsRepo.findOne({ where: { employeeId: data.employeeId, date: data.date } });
        if (existing) {
            await this.tsRepo.update(existing.id, { ...data, status: timesheet_entity_1.TimesheetStatus.SUBMITTED });
            return this.tsRepo.findOne({ where: { id: existing.id } });
        }
        return this.tsRepo.save(this.tsRepo.create({ ...data, status: timesheet_entity_1.TimesheetStatus.SUBMITTED }));
    }
    async getTimesheets(p) {
        const qb = this.tsRepo.createQueryBuilder('ts').orderBy('ts.date', 'DESC');
        if (p.employeeId)
            qb.andWhere('ts.employeeId = :eid', { eid: p.employeeId });
        if (p.date)
            qb.andWhere('ts.date = :date', { date: p.date });
        if (p.projectId)
            qb.andWhere('ts.projectId = :pid', { pid: p.projectId });
        if (p.status)
            qb.andWhere('ts.status = :s', { s: p.status });
        if (p.month && p.year)
            qb.andWhere('EXTRACT(MONTH FROM ts.date) = :m AND EXTRACT(YEAR FROM ts.date) = :y', { m: p.month, y: p.year });
        return qb.getMany();
    }
    async approveTimesheet(id, approvedBy) {
        await this.tsRepo.update(id, { status: timesheet_entity_1.TimesheetStatus.APPROVED, approvedBy, approvedAt: new Date() });
        return this.tsRepo.findOne({ where: { id } });
    }
    async rejectTimesheet(id, reason, approvedBy) {
        await this.tsRepo.update(id, { status: timesheet_entity_1.TimesheetStatus.REJECTED, rejectionReason: reason, approvedBy });
        return this.tsRepo.findOne({ where: { id } });
    }
    async deleteEmployee(id) {
        return this.empRepo.delete(id);
    }
};
exports.HrService = HrService;
exports.HrService = HrService = HrService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(employee_entity_1.Employee)),
    __param(1, (0, typeorm_1.InjectRepository)(attendance_entity_1.Attendance)),
    __param(2, (0, typeorm_1.InjectRepository)(salary_record_entity_1.SalaryRecord)),
    __param(3, (0, typeorm_1.InjectRepository)(leave_request_entity_1.LeaveRequest)),
    __param(4, (0, typeorm_1.InjectRepository)(timesheet_entity_1.Timesheet)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        config_1.ConfigService,
        users_service_1.UsersService])
], HrService);
//# sourceMappingURL=hr.service.js.map