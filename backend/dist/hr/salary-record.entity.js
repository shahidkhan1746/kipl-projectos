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
exports.SalaryRecord = exports.SalaryStatus = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("../shared/entities/base.entity");
var SalaryStatus;
(function (SalaryStatus) {
    SalaryStatus["DRAFT"] = "draft";
    SalaryStatus["APPROVED"] = "approved";
    SalaryStatus["PAID"] = "paid";
})(SalaryStatus || (exports.SalaryStatus = SalaryStatus = {}));
let SalaryRecord = class SalaryRecord extends base_entity_1.BaseEntity {
    employeeId;
    month;
    year;
    workingDays;
    daysPresent;
    daysAbsent;
    baseSalary;
    hra;
    allowances;
    grossSalary;
    pfAmount;
    esiAmount;
    tdsAmount;
    otherDeductions;
    netSalary;
    status;
    paidOn;
    paymentMode;
    approvedBy;
};
exports.SalaryRecord = SalaryRecord;
__decorate([
    (0, typeorm_1.Column)({ name: 'employee_id' }),
    __metadata("design:type", String)
], SalaryRecord.prototype, "employeeId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], SalaryRecord.prototype, "month", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], SalaryRecord.prototype, "year", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'working_days', nullable: true }),
    __metadata("design:type", Number)
], SalaryRecord.prototype, "workingDays", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'days_present', type: 'decimal', precision: 5, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], SalaryRecord.prototype, "daysPresent", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'days_absent', type: 'decimal', precision: 5, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], SalaryRecord.prototype, "daysAbsent", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'base_salary', type: 'decimal', precision: 10, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], SalaryRecord.prototype, "baseSalary", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'hra', type: 'decimal', precision: 10, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], SalaryRecord.prototype, "hra", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'allowances', type: 'decimal', precision: 10, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], SalaryRecord.prototype, "allowances", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'gross_salary', type: 'decimal', precision: 10, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], SalaryRecord.prototype, "grossSalary", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'pf_amount', type: 'decimal', precision: 10, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], SalaryRecord.prototype, "pfAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'esi_amount', type: 'decimal', precision: 10, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], SalaryRecord.prototype, "esiAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tds_amount', type: 'decimal', precision: 10, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], SalaryRecord.prototype, "tdsAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'other_deductions', type: 'decimal', precision: 10, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], SalaryRecord.prototype, "otherDeductions", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'net_salary', type: 'decimal', precision: 10, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], SalaryRecord.prototype, "netSalary", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: SalaryStatus, default: SalaryStatus.DRAFT }),
    __metadata("design:type", String)
], SalaryRecord.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'paid_on', type: 'date', nullable: true }),
    __metadata("design:type", String)
], SalaryRecord.prototype, "paidOn", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'payment_mode', nullable: true }),
    __metadata("design:type", String)
], SalaryRecord.prototype, "paymentMode", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'approved_by', nullable: true }),
    __metadata("design:type", String)
], SalaryRecord.prototype, "approvedBy", void 0);
exports.SalaryRecord = SalaryRecord = __decorate([
    (0, typeorm_1.Entity)('salary_records')
], SalaryRecord);
//# sourceMappingURL=salary-record.entity.js.map