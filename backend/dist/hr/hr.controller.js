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
Object.defineProperty(exports, "__esModule", { value: true });
exports.HrController = void 0;
const common_1 = require("@nestjs/common");
const hr_service_1 = require("./hr.service");
const id_card_html_1 = require("./id-card.html");
const create_employee_dto_1 = require("./dto/create-employee.dto");
const mark_attendance_dto_1 = require("./dto/mark-attendance.dto");
const generate_salary_dto_1 = require("./dto/generate-salary.dto");
const apply_leave_dto_1 = require("./dto/apply-leave.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const leave_request_entity_1 = require("./leave-request.entity");
let HrController = class HrController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    dashboard(projectId) { return this.svc.dashboard(projectId); }
    nextEmpCode() { return this.svc.generateNextEmpCode().then(code => ({ code })); }
    listEmployees(q) { return this.svc.listEmployees({ department: q.department, status: q.status, search: q.search, projectId: q.projectId }); }
    createEmployee(dto) { return this.svc.createEmployee(dto); }
    deleteEmployee(id) { return this.svc.deleteEmployee(id); }
    getEmployee(id) { return this.svc.getEmployee(id); }
    async idCardHtml(id, res) {
        const emp = await this.svc.getEmployee(id);
        res.set('Content-Type', 'text/html; charset=utf-8');
        res.end((0, id_card_html_1.buildIdCardHtml)(emp));
    }
    async idCardPdf(id, res) {
        const emp = await this.svc.getEmployee(id);
        const g = process.env.GOTENBERG_URL;
        if (!g) {
            res.status(501).json({ message: 'Server PDF needs GOTENBERG_URL configured. Use the in-app ID Card (PDF) or View HTML card.' });
            return;
        }
        try {
            const html = (0, id_card_html_1.buildIdCardHtml)(emp);
            const FD = globalThis.FormData;
            const B = globalThis.Blob;
            const fd = new FD();
            fd.append('files', new B([html], { type: 'text/html' }), 'index.html');
            const r = await globalThis.fetch(`${g.replace(/\/$/, '')}/forms/chromium/convert/html`, { method: 'POST', body: fd });
            if (!r.ok)
                throw new Error('Gotenberg returned ' + r.status);
            const buf = Buffer.from(await r.arrayBuffer());
            res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="ID-${emp.empCode ?? id}.pdf"` });
            res.end(buf);
        }
        catch (e) {
            res.status(502).json({ message: 'Gotenberg render failed: ' + (e?.message ?? e) });
        }
    }
    updateEmployee(id, body) { return this.svc.updateEmployee(id, body); }
    getAttendance(q) { return this.svc.getAttendance({ employeeId: q.employeeId, date: q.date, month: q.month ? parseInt(q.month) : undefined, year: q.year ? parseInt(q.year) : undefined, projectId: q.projectId }); }
    todayAttendance(projectId) { return this.svc.getTodayAttendance(projectId); }
    markAttendance(dto) { return this.svc.markAttendance(dto); }
    bulkAttendance(body) { return this.svc.bulkMarkAttendance(body.records); }
    monthlyReport(empId, year, month) { return this.svc.getMonthlyReport(empId, parseInt(year), parseInt(month)); }
    listSalary(q) { return this.svc.listSalary({ employeeId: q.employeeId, month: q.month ? parseInt(q.month) : undefined, year: q.year ? parseInt(q.year) : undefined, status: q.status }); }
    generateSalary(dto, req) { return this.svc.generateSalary(dto, req.user.id); }
    approveSalary(id) { return this.svc.approveSalary(id); }
    markPaid(id, pm) { return this.svc.markPaid(id, pm ?? 'bank_transfer'); }
    listLeaves(q) { return this.svc.listLeaves({ employeeId: q.employeeId, status: q.status }); }
    applyLeave(dto) { return this.svc.applyLeave(dto); }
    approveLeave(id, req) { return this.svc.processLeave(id, leave_request_entity_1.LeaveStatus.APPROVED, req.user.id); }
    getTimesheets(q) {
        return this.svc.getTimesheets({ employeeId: q.employeeId, date: q.date, month: q.month ? parseInt(q.month) : undefined, year: q.year ? parseInt(q.year) : undefined, projectId: q.projectId, status: q.status });
    }
    manpower(pid, date) { return this.svc.dailyManpower(pid, date); }
    manpowerRange(pid, from, to) { return this.svc.manpowerRange(pid, from, to); }
    submitTimesheet(body) { return this.svc.submitTimesheet(body); }
    approveTimesheet(id, req) { return this.svc.approveTimesheet(id, req.user.id); }
    rejectTimesheet(id, reason, req) { return this.svc.rejectTimesheet(id, reason, req.user.id); }
    rejectLeave(id, req) { return this.svc.processLeave(id, leave_request_entity_1.LeaveStatus.REJECTED, req.user.id); }
};
exports.HrController = HrController;
__decorate([
    (0, common_1.Get)('dashboard'),
    __param(0, (0, common_1.Query)('projectId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], HrController.prototype, "dashboard", null);
__decorate([
    (0, common_1.Get)('employees/next-code'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], HrController.prototype, "nextEmpCode", null);
__decorate([
    (0, common_1.Get)('employees'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], HrController.prototype, "listEmployees", null);
__decorate([
    (0, common_1.Post)('employees'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_employee_dto_1.CreateEmployeeDto]),
    __metadata("design:returntype", void 0)
], HrController.prototype, "createEmployee", null);
__decorate([
    (0, common_1.Delete)('employees/:id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], HrController.prototype, "deleteEmployee", null);
__decorate([
    (0, common_1.Get)('employees/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], HrController.prototype, "getEmployee", null);
__decorate([
    (0, common_1.Get)('id-card/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], HrController.prototype, "idCardHtml", null);
__decorate([
    (0, common_1.Get)('id-card/:id/pdf'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], HrController.prototype, "idCardPdf", null);
__decorate([
    (0, common_1.Patch)('employees/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], HrController.prototype, "updateEmployee", null);
__decorate([
    (0, common_1.Get)('attendance'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], HrController.prototype, "getAttendance", null);
__decorate([
    (0, common_1.Get)('attendance/today'),
    __param(0, (0, common_1.Query)('projectId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], HrController.prototype, "todayAttendance", null);
__decorate([
    (0, common_1.Post)('attendance'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [mark_attendance_dto_1.MarkAttendanceDto]),
    __metadata("design:returntype", void 0)
], HrController.prototype, "markAttendance", null);
__decorate([
    (0, common_1.Post)('attendance/bulk'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], HrController.prototype, "bulkAttendance", null);
__decorate([
    (0, common_1.Get)('attendance/report/:empId/:year/:month'),
    __param(0, (0, common_1.Param)('empId')),
    __param(1, (0, common_1.Param)('year')),
    __param(2, (0, common_1.Param)('month')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], HrController.prototype, "monthlyReport", null);
__decorate([
    (0, common_1.Get)('salary'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], HrController.prototype, "listSalary", null);
__decorate([
    (0, common_1.Post)('salary/generate'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [generate_salary_dto_1.GenerateSalaryDto, Object]),
    __metadata("design:returntype", void 0)
], HrController.prototype, "generateSalary", null);
__decorate([
    (0, common_1.Patch)('salary/:id/approve'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], HrController.prototype, "approveSalary", null);
__decorate([
    (0, common_1.Patch)('salary/:id/paid'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('paymentMode')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], HrController.prototype, "markPaid", null);
__decorate([
    (0, common_1.Get)('leave'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], HrController.prototype, "listLeaves", null);
__decorate([
    (0, common_1.Post)('leave'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [apply_leave_dto_1.ApplyLeaveDto]),
    __metadata("design:returntype", void 0)
], HrController.prototype, "applyLeave", null);
__decorate([
    (0, common_1.Patch)('leave/:id/approve'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], HrController.prototype, "approveLeave", null);
__decorate([
    (0, common_1.Get)('timesheets'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], HrController.prototype, "getTimesheets", null);
__decorate([
    (0, common_1.Get)('manpower'),
    __param(0, (0, common_1.Query)('projectId')),
    __param(1, (0, common_1.Query)('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], HrController.prototype, "manpower", null);
__decorate([
    (0, common_1.Get)('manpower-range'),
    __param(0, (0, common_1.Query)('projectId')),
    __param(1, (0, common_1.Query)('from')),
    __param(2, (0, common_1.Query)('to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], HrController.prototype, "manpowerRange", null);
__decorate([
    (0, common_1.Post)('timesheets'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], HrController.prototype, "submitTimesheet", null);
__decorate([
    (0, common_1.Patch)('timesheets/:id/approve'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], HrController.prototype, "approveTimesheet", null);
__decorate([
    (0, common_1.Patch)('timesheets/:id/reject'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('reason')),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], HrController.prototype, "rejectTimesheet", null);
__decorate([
    (0, common_1.Patch)('leave/:id/reject'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], HrController.prototype, "rejectLeave", null);
exports.HrController = HrController = __decorate([
    (0, common_1.Controller)('hr'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [hr_service_1.HrService])
], HrController);
//# sourceMappingURL=hr.controller.js.map