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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Timesheet = exports.TimesheetStatus = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("../shared/entities/base.entity");
var TimesheetStatus;
(function (TimesheetStatus) {
    TimesheetStatus["DRAFT"] = "draft";
    TimesheetStatus["SUBMITTED"] = "submitted";
    TimesheetStatus["APPROVED"] = "approved";
    TimesheetStatus["REJECTED"] = "rejected";
})(TimesheetStatus || (exports.TimesheetStatus = TimesheetStatus = {}));
let Timesheet = class Timesheet extends base_entity_1.BaseEntity {
    employeeId;
    projectId;
    date;
    activities;
    attendanceStatus;
    workDoneSummary;
    issuesFaced;
    nextDayPlan;
    status;
    approvedBy;
    approvedAt;
    rejectionReason;
};
exports.Timesheet = Timesheet;
__decorate([
    (0, typeorm_1.Column)({ name: 'employee_id' }),
    __metadata("design:type", String)
], Timesheet.prototype, "employeeId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'project_id', nullable: true }),
    __metadata("design:type", String)
], Timesheet.prototype, "projectId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date' }),
    __metadata("design:type", String)
], Timesheet.prototype, "date", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', default: [] }),
    __metadata("design:type", Array)
], Timesheet.prototype, "activities", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'attendance_status', default: 'present' }),
    __metadata("design:type", String)
], Timesheet.prototype, "attendanceStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'work_done_summary', type: 'text', nullable: true }),
    __metadata("design:type", String)
], Timesheet.prototype, "workDoneSummary", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'issues_faced', type: 'text', nullable: true }),
    __metadata("design:type", String)
], Timesheet.prototype, "issuesFaced", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'next_day_plan', type: 'text', nullable: true }),
    __metadata("design:type", String)
], Timesheet.prototype, "nextDayPlan", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: TimesheetStatus, default: TimesheetStatus.DRAFT }),
    __metadata("design:type", String)
], Timesheet.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'approved_by', nullable: true }),
    __metadata("design:type", String)
], Timesheet.prototype, "approvedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'approved_at', nullable: true }),
    __metadata("design:type", Date)
], Timesheet.prototype, "approvedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'rejection_reason', nullable: true }),
    __metadata("design:type", String)
], Timesheet.prototype, "rejectionReason", void 0);
exports.Timesheet = Timesheet = __decorate([
    (0, typeorm_1.Entity)('timesheets')
], Timesheet);
//# sourceMappingURL=timesheet.entity.js.map