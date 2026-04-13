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
exports.TdsEntry = exports.TdsStatus = exports.TdsSection = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("../shared/entities/base.entity");
var TdsSection;
(function (TdsSection) {
    TdsSection["S194C"] = "194C";
    TdsSection["S194I"] = "194I";
    TdsSection["S194J"] = "194J";
    TdsSection["S194A"] = "194A";
    TdsSection["OTHER"] = "Other";
})(TdsSection || (exports.TdsSection = TdsSection = {}));
var TdsStatus;
(function (TdsStatus) {
    TdsStatus["DEDUCTED"] = "deducted";
    TdsStatus["DEPOSITED"] = "deposited";
})(TdsStatus || (exports.TdsStatus = TdsStatus = {}));
let TdsEntry = class TdsEntry extends base_entity_1.BaseEntity {
    projectId;
    vendorId;
    refId;
    refType;
    date;
    payeeName;
    payeePan;
    section;
    grossAmount;
    tdsRate;
    tdsAmount;
    quarter;
    financialYear;
    status;
    depositDate;
    challanNo;
};
exports.TdsEntry = TdsEntry;
__decorate([
    (0, typeorm_1.Column)({ name: 'project_id' }),
    __metadata("design:type", String)
], TdsEntry.prototype, "projectId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'vendor_id', nullable: true }),
    __metadata("design:type", String)
], TdsEntry.prototype, "vendorId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ref_id', nullable: true }),
    __metadata("design:type", String)
], TdsEntry.prototype, "refId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ref_type', nullable: true }),
    __metadata("design:type", String)
], TdsEntry.prototype, "refType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date' }),
    __metadata("design:type", String)
], TdsEntry.prototype, "date", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'payee_name' }),
    __metadata("design:type", String)
], TdsEntry.prototype, "payeeName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'payee_pan', nullable: true }),
    __metadata("design:type", String)
], TdsEntry.prototype, "payeePan", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: TdsSection, default: TdsSection.S194C }),
    __metadata("design:type", String)
], TdsEntry.prototype, "section", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'gross_amount', type: 'decimal', precision: 15, scale: 2 }),
    __metadata("design:type", Number)
], TdsEntry.prototype, "grossAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tds_rate', type: 'decimal', precision: 5, scale: 2 }),
    __metadata("design:type", Number)
], TdsEntry.prototype, "tdsRate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tds_amount', type: 'decimal', precision: 15, scale: 2 }),
    __metadata("design:type", Number)
], TdsEntry.prototype, "tdsAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], TdsEntry.prototype, "quarter", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'financial_year', nullable: true }),
    __metadata("design:type", String)
], TdsEntry.prototype, "financialYear", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: TdsStatus, default: TdsStatus.DEDUCTED }),
    __metadata("design:type", String)
], TdsEntry.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'deposit_date', type: 'date', nullable: true }),
    __metadata("design:type", String)
], TdsEntry.prototype, "depositDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'challan_no', nullable: true }),
    __metadata("design:type", String)
], TdsEntry.prototype, "challanNo", void 0);
exports.TdsEntry = TdsEntry = __decorate([
    (0, typeorm_1.Entity)('tds_entries')
], TdsEntry);
//# sourceMappingURL=tds-entry.entity.js.map