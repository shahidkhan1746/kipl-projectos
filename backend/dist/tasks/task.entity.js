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
exports.Task = exports.TaskStatus = exports.TaskPriority = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("../shared/entities/base.entity");
var TaskPriority;
(function (TaskPriority) {
    TaskPriority["CRITICAL"] = "critical";
    TaskPriority["HIGH"] = "high";
    TaskPriority["MEDIUM"] = "medium";
    TaskPriority["LOW"] = "low";
})(TaskPriority || (exports.TaskPriority = TaskPriority = {}));
var TaskStatus;
(function (TaskStatus) {
    TaskStatus["TODO"] = "todo";
    TaskStatus["IN_PROGRESS"] = "in_progress";
    TaskStatus["REVIEW"] = "review";
    TaskStatus["DONE"] = "done";
    TaskStatus["BLOCKED"] = "blocked";
})(TaskStatus || (exports.TaskStatus = TaskStatus = {}));
let Task = class Task extends base_entity_1.BaseEntity {
    projectId;
    title;
    description;
    priority;
    status;
    assignedTo;
    assignedName;
    createdBy;
    dueDate;
    completedDate;
    wbsCode;
    wbsTitle;
    category;
    progressPct;
    comments;
    sortOrder;
};
exports.Task = Task;
__decorate([
    (0, typeorm_1.Column)({ name: 'project_id' }),
    __metadata("design:type", String)
], Task.prototype, "projectId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Task.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Task.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: TaskPriority, default: TaskPriority.MEDIUM }),
    __metadata("design:type", String)
], Task.prototype, "priority", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: TaskStatus, default: TaskStatus.TODO }),
    __metadata("design:type", String)
], Task.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'assigned_to', nullable: true }),
    __metadata("design:type", String)
], Task.prototype, "assignedTo", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'assigned_name', nullable: true }),
    __metadata("design:type", String)
], Task.prototype, "assignedName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_by', nullable: true }),
    __metadata("design:type", String)
], Task.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'due_date', type: 'date', nullable: true }),
    __metadata("design:type", String)
], Task.prototype, "dueDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'completed_date', type: 'date', nullable: true }),
    __metadata("design:type", String)
], Task.prototype, "completedDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'wbs_code', nullable: true }),
    __metadata("design:type", String)
], Task.prototype, "wbsCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'wbs_title', nullable: true }),
    __metadata("design:type", String)
], Task.prototype, "wbsTitle", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Task.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'progress_pct', type: 'decimal', precision: 5, scale: 1, default: 0 }),
    __metadata("design:type", Number)
], Task.prototype, "progressPct", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', default: [] }),
    __metadata("design:type", Array)
], Task.prototype, "comments", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sort_order', default: 0 }),
    __metadata("design:type", Number)
], Task.prototype, "sortOrder", void 0);
exports.Task = Task = __decorate([
    (0, typeorm_1.Entity)('tasks')
], Task);
//# sourceMappingURL=task.entity.js.map