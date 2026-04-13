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
exports.Expense = exports.ExpenseStatus = exports.ExpenseCategory = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("../shared/entities/base.entity");
var ExpenseCategory;
(function (ExpenseCategory) {
    ExpenseCategory["MATERIAL"] = "material";
    ExpenseCategory["LABOUR"] = "labour";
    ExpenseCategory["EQUIPMENT_HIRE"] = "equipment_hire";
    ExpenseCategory["FUEL"] = "fuel";
    ExpenseCategory["TRANSPORT"] = "transport";
    ExpenseCategory["SITE_OFFICE"] = "site_office";
    ExpenseCategory["SAFETY"] = "safety";
    ExpenseCategory["TESTING"] = "testing";
    ExpenseCategory["SUBCONTRACT"] = "subcontract";
    ExpenseCategory["GOVERNMENT_FEE"] = "government_fee";
    ExpenseCategory["STAFF_SALARY"] = "staff_salary";
    ExpenseCategory["MISCELLANEOUS"] = "miscellaneous";
})(ExpenseCategory || (exports.ExpenseCategory = ExpenseCategory = {}));
var ExpenseStatus;
(function (ExpenseStatus) {
    ExpenseStatus["PENDING"] = "pending";
    ExpenseStatus["APPROVED"] = "approved";
    ExpenseStatus["PAID"] = "paid";
    ExpenseStatus["REJECTED"] = "rejected";
})(ExpenseStatus || (exports.ExpenseStatus = ExpenseStatus = {}));
let Expense = class Expense extends base_entity_1.BaseEntity {
    projectId;
    vendorId;
    date;
    description;
    category;
    billNo;
    billDate;
    grossAmount;
    gstPct;
    gstAmount;
    tdsPct;
    tdsAmount;
    netPayable;
    paidAmount;
    paymentDate;
    paymentMode;
    paymentRef;
    status;
    approvedBy;
    remarks;
};
exports.Expense = Expense;
__decorate([
    (0, typeorm_1.Column)({ name: 'project_id' }),
    __metadata("design:type", String)
], Expense.prototype, "projectId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'vendor_id', nullable: true }),
    __metadata("design:type", String)
], Expense.prototype, "vendorId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date' }),
    __metadata("design:type", String)
], Expense.prototype, "date", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], Expense.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ExpenseCategory }),
    __metadata("design:type", String)
], Expense.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'bill_no', nullable: true }),
    __metadata("design:type", String)
], Expense.prototype, "billNo", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'bill_date', type: 'date', nullable: true }),
    __metadata("design:type", String)
], Expense.prototype, "billDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'gross_amount', type: 'decimal', precision: 15, scale: 2 }),
    __metadata("design:type", Number)
], Expense.prototype, "grossAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'gst_pct', type: 'decimal', precision: 5, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], Expense.prototype, "gstPct", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'gst_amount', type: 'decimal', precision: 15, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], Expense.prototype, "gstAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tds_pct', type: 'decimal', precision: 5, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], Expense.prototype, "tdsPct", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tds_amount', type: 'decimal', precision: 15, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], Expense.prototype, "tdsAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'net_payable', type: 'decimal', precision: 15, scale: 2 }),
    __metadata("design:type", Number)
], Expense.prototype, "netPayable", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'paid_amount', type: 'decimal', precision: 15, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], Expense.prototype, "paidAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'payment_date', type: 'date', nullable: true }),
    __metadata("design:type", String)
], Expense.prototype, "paymentDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'payment_mode', nullable: true }),
    __metadata("design:type", String)
], Expense.prototype, "paymentMode", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'payment_ref', nullable: true }),
    __metadata("design:type", String)
], Expense.prototype, "paymentRef", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ExpenseStatus, default: ExpenseStatus.PENDING }),
    __metadata("design:type", String)
], Expense.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'approved_by', nullable: true }),
    __metadata("design:type", String)
], Expense.prototype, "approvedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Expense.prototype, "remarks", void 0);
exports.Expense = Expense = __decorate([
    (0, typeorm_1.Entity)('expenses')
], Expense);
//# sourceMappingURL=expense.entity.js.map