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
exports.QaInspection = exports.InspectionStatus = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("../shared/entities/base.entity");
var InspectionStatus;
(function (InspectionStatus) {
    InspectionStatus["DRAFT"] = "draft";
    InspectionStatus["SUBMITTED"] = "submitted";
    InspectionStatus["PASSED"] = "passed";
    InspectionStatus["FAILED"] = "failed";
    InspectionStatus["CONDITIONAL"] = "conditional";
})(InspectionStatus || (exports.InspectionStatus = InspectionStatus = {}));
let QaInspection = class QaInspection extends base_entity_1.BaseEntity {
    projectId;
    checklistId;
    date;
    workItem;
    location;
    chainage;
    inspectedBy;
    contractorRep;
    engineerRep;
    responses;
    overallResult;
    passCount;
    failCount;
    naCount;
    remarks;
    ncrRaised;
    ncrId;
};
exports.QaInspection = QaInspection;
__decorate([
    (0, typeorm_1.Column)({ name: 'project_id' }),
    __metadata("design:type", String)
], QaInspection.prototype, "projectId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'checklist_id', nullable: true }),
    __metadata("design:type", String)
], QaInspection.prototype, "checklistId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date' }),
    __metadata("design:type", String)
], QaInspection.prototype, "date", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'work_item' }),
    __metadata("design:type", String)
], QaInspection.prototype, "workItem", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], QaInspection.prototype, "location", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], QaInspection.prototype, "chainage", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'inspected_by' }),
    __metadata("design:type", String)
], QaInspection.prototype, "inspectedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'contractor_rep', nullable: true }),
    __metadata("design:type", String)
], QaInspection.prototype, "contractorRep", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'engineer_rep', nullable: true }),
    __metadata("design:type", String)
], QaInspection.prototype, "engineerRep", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', default: [] }),
    __metadata("design:type", Array)
], QaInspection.prototype, "responses", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'overall_result', type: 'enum', enum: InspectionStatus, default: InspectionStatus.DRAFT }),
    __metadata("design:type", String)
], QaInspection.prototype, "overallResult", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'pass_count', default: 0 }),
    __metadata("design:type", Number)
], QaInspection.prototype, "passCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'fail_count', default: 0 }),
    __metadata("design:type", Number)
], QaInspection.prototype, "failCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'na_count', default: 0 }),
    __metadata("design:type", Number)
], QaInspection.prototype, "naCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], QaInspection.prototype, "remarks", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ncr_raised', default: false }),
    __metadata("design:type", Boolean)
], QaInspection.prototype, "ncrRaised", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ncr_id', nullable: true }),
    __metadata("design:type", String)
], QaInspection.prototype, "ncrId", void 0);
exports.QaInspection = QaInspection = __decorate([
    (0, typeorm_1.Entity)('qa_inspections')
], QaInspection);
//# sourceMappingURL=qa-inspection.entity.js.map