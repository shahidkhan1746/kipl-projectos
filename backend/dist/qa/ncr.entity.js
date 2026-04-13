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
exports.Ncr = exports.NcrSeverity = exports.NcrStatus = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("../shared/entities/base.entity");
var NcrStatus;
(function (NcrStatus) {
    NcrStatus["OPEN"] = "open";
    NcrStatus["UNDER_REVIEW"] = "under_review";
    NcrStatus["CLOSED"] = "closed";
    NcrStatus["REJECTED"] = "rejected";
})(NcrStatus || (exports.NcrStatus = NcrStatus = {}));
var NcrSeverity;
(function (NcrSeverity) {
    NcrSeverity["MINOR"] = "minor";
    NcrSeverity["MAJOR"] = "major";
    NcrSeverity["CRITICAL"] = "critical";
})(NcrSeverity || (exports.NcrSeverity = NcrSeverity = {}));
let Ncr = class Ncr extends base_entity_1.BaseEntity {
    projectId;
    ncrNo;
    date;
    workItem;
    location;
    description;
    raisedBy;
    severity;
    status;
    rootCause;
    correctiveAction;
    targetDate;
    closedDate;
    closedBy;
    inspectionId;
    remarks;
};
exports.Ncr = Ncr;
__decorate([
    (0, typeorm_1.Column)({ name: 'project_id' }),
    __metadata("design:type", String)
], Ncr.prototype, "projectId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ncr_no' }),
    __metadata("design:type", String)
], Ncr.prototype, "ncrNo", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date' }),
    __metadata("design:type", String)
], Ncr.prototype, "date", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'work_item' }),
    __metadata("design:type", String)
], Ncr.prototype, "workItem", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Ncr.prototype, "location", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], Ncr.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'raised_by' }),
    __metadata("design:type", String)
], Ncr.prototype, "raisedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: NcrSeverity, default: NcrSeverity.MINOR }),
    __metadata("design:type", String)
], Ncr.prototype, "severity", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: NcrStatus, default: NcrStatus.OPEN }),
    __metadata("design:type", String)
], Ncr.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'root_cause', type: 'text', nullable: true }),
    __metadata("design:type", String)
], Ncr.prototype, "rootCause", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'corrective_action', type: 'text', nullable: true }),
    __metadata("design:type", String)
], Ncr.prototype, "correctiveAction", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'target_date', type: 'date', nullable: true }),
    __metadata("design:type", String)
], Ncr.prototype, "targetDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'closed_date', type: 'date', nullable: true }),
    __metadata("design:type", String)
], Ncr.prototype, "closedDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'closed_by', nullable: true }),
    __metadata("design:type", String)
], Ncr.prototype, "closedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'inspection_id', nullable: true }),
    __metadata("design:type", String)
], Ncr.prototype, "inspectionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Ncr.prototype, "remarks", void 0);
exports.Ncr = Ncr = __decorate([
    (0, typeorm_1.Entity)('ncrs')
], Ncr);
//# sourceMappingURL=ncr.entity.js.map