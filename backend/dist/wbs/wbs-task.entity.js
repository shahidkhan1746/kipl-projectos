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
exports.WbsTask = exports.TaskLevel = exports.TaskStatus = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("../shared/entities/base.entity");
var TaskStatus;
(function (TaskStatus) {
    TaskStatus["NOT_STARTED"] = "not_started";
    TaskStatus["IN_PROGRESS"] = "in_progress";
    TaskStatus["COMPLETED"] = "completed";
    TaskStatus["DELAYED"] = "delayed";
    TaskStatus["ON_HOLD"] = "on_hold";
})(TaskStatus || (exports.TaskStatus = TaskStatus = {}));
var TaskLevel;
(function (TaskLevel) {
    TaskLevel[TaskLevel["WBS1"] = 1] = "WBS1";
    TaskLevel[TaskLevel["WBS2"] = 2] = "WBS2";
    TaskLevel[TaskLevel["WBS3"] = 3] = "WBS3";
})(TaskLevel || (exports.TaskLevel = TaskLevel = {}));
let WbsTask = class WbsTask extends base_entity_1.BaseEntity {
    projectId;
    wbsCode;
    title;
    description;
    level;
    parentId;
    sortOrder;
    plannedStart;
    plannedEnd;
    plannedDuration;
    actualStart;
    actualEnd;
    progressPct;
    status;
    isMilestone;
    paymentMilestone;
    paymentPct;
    responsible;
    remarks;
    delayDays;
    delayReason;
    eotApplied;
    eotDays;
};
exports.WbsTask = WbsTask;
__decorate([
    (0, typeorm_1.Column)({ name: 'project_id' }),
    __metadata("design:type", String)
], WbsTask.prototype, "projectId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'wbs_code' }),
    __metadata("design:type", String)
], WbsTask.prototype, "wbsCode", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], WbsTask.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], WbsTask.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 1 }),
    __metadata("design:type", Number)
], WbsTask.prototype, "level", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'parent_id', nullable: true }),
    __metadata("design:type", String)
], WbsTask.prototype, "parentId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sort_order', default: 0 }),
    __metadata("design:type", Number)
], WbsTask.prototype, "sortOrder", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'planned_start', type: 'date' }),
    __metadata("design:type", String)
], WbsTask.prototype, "plannedStart", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'planned_end', type: 'date' }),
    __metadata("design:type", String)
], WbsTask.prototype, "plannedEnd", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'planned_duration', default: 0 }),
    __metadata("design:type", Number)
], WbsTask.prototype, "plannedDuration", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'actual_start', type: 'date', nullable: true }),
    __metadata("design:type", String)
], WbsTask.prototype, "actualStart", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'actual_end', type: 'date', nullable: true }),
    __metadata("design:type", String)
], WbsTask.prototype, "actualEnd", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'progress_pct', type: 'decimal', precision: 5, scale: 1, default: 0 }),
    __metadata("design:type", Number)
], WbsTask.prototype, "progressPct", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: TaskStatus, default: TaskStatus.NOT_STARTED }),
    __metadata("design:type", String)
], WbsTask.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_milestone', default: false }),
    __metadata("design:type", Boolean)
], WbsTask.prototype, "isMilestone", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'payment_milestone', nullable: true }),
    __metadata("design:type", String)
], WbsTask.prototype, "paymentMilestone", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'payment_pct', type: 'decimal', precision: 5, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], WbsTask.prototype, "paymentPct", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], WbsTask.prototype, "responsible", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], WbsTask.prototype, "remarks", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'delay_days', default: 0 }),
    __metadata("design:type", Number)
], WbsTask.prototype, "delayDays", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'delay_reason', type: 'text', nullable: true }),
    __metadata("design:type", String)
], WbsTask.prototype, "delayReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'eot_applied', default: false }),
    __metadata("design:type", Boolean)
], WbsTask.prototype, "eotApplied", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'eot_days', default: 0 }),
    __metadata("design:type", Number)
], WbsTask.prototype, "eotDays", void 0);
exports.WbsTask = WbsTask = __decorate([
    (0, typeorm_1.Entity)('wbs_tasks')
], WbsTask);
//# sourceMappingURL=wbs-task.entity.js.map