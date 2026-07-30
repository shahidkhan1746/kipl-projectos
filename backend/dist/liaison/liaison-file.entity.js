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
exports.LiaisonFile = exports.APPROVAL_CHAINS = exports.LiaisonPriority = exports.LiaisonStatus = exports.LiaisonFileType = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("../shared/entities/base.entity");
const project_entity_1 = require("../projects/project.entity");
const user_entity_1 = require("../users/user.entity");
var LiaisonFileType;
(function (LiaisonFileType) {
    LiaisonFileType["APPROVAL"] = "approval";
    LiaisonFileType["NOC"] = "noc";
    LiaisonFileType["DRAWING"] = "drawing";
    LiaisonFileType["ESTIMATE"] = "estimate";
    LiaisonFileType["REPORT"] = "report";
    LiaisonFileType["LETTER"] = "letter";
    LiaisonFileType["CLEARANCE"] = "clearance";
    LiaisonFileType["VETTING"] = "vetting";
    LiaisonFileType["OTHER"] = "other";
})(LiaisonFileType || (exports.LiaisonFileType = LiaisonFileType = {}));
var LiaisonStatus;
(function (LiaisonStatus) {
    LiaisonStatus["DRAFT"] = "draft";
    LiaisonStatus["SUBMITTED"] = "submitted";
    LiaisonStatus["UNDER_REVIEW"] = "under_review";
    LiaisonStatus["APPROVED"] = "approved";
    LiaisonStatus["REJECTED"] = "rejected";
    LiaisonStatus["RETURNED"] = "returned";
    LiaisonStatus["CLOSED"] = "closed";
})(LiaisonStatus || (exports.LiaisonStatus = LiaisonStatus = {}));
var LiaisonPriority;
(function (LiaisonPriority) {
    LiaisonPriority["LOW"] = "low";
    LiaisonPriority["MEDIUM"] = "medium";
    LiaisonPriority["HIGH"] = "high";
    LiaisonPriority["URGENT"] = "urgent";
})(LiaisonPriority || (exports.LiaisonPriority = LiaisonPriority = {}));
exports.APPROVAL_CHAINS = {
    [LiaisonFileType.APPROVAL]: ['JE', 'AEE', 'XEN', 'SE'],
    [LiaisonFileType.NOC]: ['JE', 'AEE', 'XEN'],
    [LiaisonFileType.DRAWING]: ['JE', 'XEN'],
    [LiaisonFileType.ESTIMATE]: ['AEE', 'XEN', 'SE'],
    [LiaisonFileType.REPORT]: ['XEN'],
    [LiaisonFileType.LETTER]: ['XEN'],
    [LiaisonFileType.CLEARANCE]: ['JE', 'AEE', 'XEN', 'SE'],
    [LiaisonFileType.VETTING]: ['AEE', 'XEN', 'SE'],
    [LiaisonFileType.OTHER]: ['JE', 'AEE', 'XEN', 'SE'],
};
let LiaisonFile = class LiaisonFile extends base_entity_1.BaseEntity {
    project;
    projectId;
    fileNumber;
    departmentRef;
    subject;
    fileType;
    priority;
    currentStatus;
    currentHolder;
    currentHolderId;
    initiatedBy;
    initiatedById;
    department;
    dueDate;
    expectedDate;
    actualDate;
    delayDays;
    isEotGround;
    eotReason;
    linkedWbsCode;
    remarks;
    approvalChain;
};
exports.LiaisonFile = LiaisonFile;
__decorate([
    (0, typeorm_1.ManyToOne)(() => project_entity_1.Project, { eager: false }),
    (0, typeorm_1.JoinColumn)({ name: 'project_id' }),
    __metadata("design:type", project_entity_1.Project)
], LiaisonFile.prototype, "project", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'project_id' }),
    __metadata("design:type", String)
], LiaisonFile.prototype, "projectId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'file_number', unique: true, nullable: true }),
    __metadata("design:type", String)
], LiaisonFile.prototype, "fileNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'department_ref', type: 'varchar', nullable: true }),
    __metadata("design:type", String)
], LiaisonFile.prototype, "departmentRef", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], LiaisonFile.prototype, "subject", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'file_type', type: 'enum', enum: LiaisonFileType }),
    __metadata("design:type", String)
], LiaisonFile.prototype, "fileType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: LiaisonPriority, default: LiaisonPriority.MEDIUM }),
    __metadata("design:type", String)
], LiaisonFile.prototype, "priority", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'current_status', type: 'enum', enum: LiaisonStatus, default: LiaisonStatus.DRAFT }),
    __metadata("design:type", String)
], LiaisonFile.prototype, "currentStatus", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { nullable: true, eager: false }),
    (0, typeorm_1.JoinColumn)({ name: 'current_holder_id' }),
    __metadata("design:type", user_entity_1.User)
], LiaisonFile.prototype, "currentHolder", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'current_holder_id', nullable: true }),
    __metadata("design:type", String)
], LiaisonFile.prototype, "currentHolderId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { eager: false }),
    (0, typeorm_1.JoinColumn)({ name: 'initiated_by' }),
    __metadata("design:type", user_entity_1.User)
], LiaisonFile.prototype, "initiatedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'initiated_by' }),
    __metadata("design:type", String)
], LiaisonFile.prototype, "initiatedById", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], LiaisonFile.prototype, "department", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'due_date', type: 'date', nullable: true }),
    __metadata("design:type", String)
], LiaisonFile.prototype, "dueDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'expected_date', type: 'date', nullable: true }),
    __metadata("design:type", String)
], LiaisonFile.prototype, "expectedDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'actual_date', type: 'date', nullable: true }),
    __metadata("design:type", String)
], LiaisonFile.prototype, "actualDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'delay_days', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], LiaisonFile.prototype, "delayDays", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_eot_ground', default: false }),
    __metadata("design:type", Boolean)
], LiaisonFile.prototype, "isEotGround", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'eot_reason', type: 'text', nullable: true }),
    __metadata("design:type", String)
], LiaisonFile.prototype, "eotReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'linked_wbs_code', type: 'varchar', nullable: true }),
    __metadata("design:type", String)
], LiaisonFile.prototype, "linkedWbsCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], LiaisonFile.prototype, "remarks", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'approval_chain', type: 'jsonb', default: [] }),
    __metadata("design:type", Array)
], LiaisonFile.prototype, "approvalChain", void 0);
exports.LiaisonFile = LiaisonFile = __decorate([
    (0, typeorm_1.Entity)('liaison_files')
], LiaisonFile);
//# sourceMappingURL=liaison-file.entity.js.map