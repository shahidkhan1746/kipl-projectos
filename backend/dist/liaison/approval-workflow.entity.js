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
exports.ApprovalWorkflow = exports.WorkflowStatus = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("../shared/entities/base.entity");
const liaison_file_entity_1 = require("./liaison-file.entity");
const user_entity_1 = require("../users/user.entity");
var WorkflowStatus;
(function (WorkflowStatus) {
    WorkflowStatus["PENDING"] = "pending";
    WorkflowStatus["APPROVED"] = "approved";
    WorkflowStatus["REJECTED"] = "rejected";
    WorkflowStatus["SKIPPED"] = "skipped";
})(WorkflowStatus || (exports.WorkflowStatus = WorkflowStatus = {}));
let ApprovalWorkflow = class ApprovalWorkflow extends base_entity_1.BaseEntity {
    file;
    fileId;
    stepOrder;
    approverRole;
    approver;
    approverId;
    status;
    actionAt;
    remarks;
};
exports.ApprovalWorkflow = ApprovalWorkflow;
__decorate([
    (0, typeorm_1.ManyToOne)(() => liaison_file_entity_1.LiaisonFile, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'file_id' }),
    __metadata("design:type", liaison_file_entity_1.LiaisonFile)
], ApprovalWorkflow.prototype, "file", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'file_id' }),
    __metadata("design:type", String)
], ApprovalWorkflow.prototype, "fileId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'step_order' }),
    __metadata("design:type", Number)
], ApprovalWorkflow.prototype, "stepOrder", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'approver_role', length: 20 }),
    __metadata("design:type", String)
], ApprovalWorkflow.prototype, "approverRole", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { nullable: true, eager: false }),
    (0, typeorm_1.JoinColumn)({ name: 'approver_id' }),
    __metadata("design:type", user_entity_1.User)
], ApprovalWorkflow.prototype, "approver", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'approver_id', nullable: true }),
    __metadata("design:type", String)
], ApprovalWorkflow.prototype, "approverId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: WorkflowStatus, default: WorkflowStatus.PENDING }),
    __metadata("design:type", String)
], ApprovalWorkflow.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'action_at', nullable: true }),
    __metadata("design:type", Date)
], ApprovalWorkflow.prototype, "actionAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], ApprovalWorkflow.prototype, "remarks", void 0);
exports.ApprovalWorkflow = ApprovalWorkflow = __decorate([
    (0, typeorm_1.Entity)('approval_workflows')
], ApprovalWorkflow);
//# sourceMappingURL=approval-workflow.entity.js.map