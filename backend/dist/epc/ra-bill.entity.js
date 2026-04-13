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
exports.RaBill = exports.RaBillStatus = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("../shared/entities/base.entity");
var RaBillStatus;
(function (RaBillStatus) {
    RaBillStatus["DRAFT"] = "draft";
    RaBillStatus["SUBMITTED"] = "submitted";
    RaBillStatus["VERIFIED"] = "verified";
    RaBillStatus["APPROVED"] = "approved";
    RaBillStatus["PAID"] = "paid";
    RaBillStatus["REJECTED"] = "rejected";
})(RaBillStatus || (exports.RaBillStatus = RaBillStatus = {}));
let RaBill = class RaBill extends base_entity_1.BaseEntity {
    projectId;
    billNo;
    allotmentNo;
    billDate;
    periodFrom;
    periodTo;
    lineItems;
    grossAmount;
    prevBilled;
    netThisBill;
    gstPct;
    gstAmount;
    tdsPct;
    tdsAmount;
    securityDepositPct;
    securityDepositAmount;
    netPayable;
    amountInWords;
    status;
    submittedDate;
    approvedDate;
    paidDate;
    remarks;
};
exports.RaBill = RaBill;
__decorate([
    (0, typeorm_1.Column)({ name: 'project_id' }),
    __metadata("design:type", String)
], RaBill.prototype, "projectId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'bill_no' }),
    __metadata("design:type", String)
], RaBill.prototype, "billNo", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'allotment_no', nullable: true }),
    __metadata("design:type", String)
], RaBill.prototype, "allotmentNo", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'bill_date', type: 'date' }),
    __metadata("design:type", String)
], RaBill.prototype, "billDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'period_from', type: 'date', nullable: true }),
    __metadata("design:type", String)
], RaBill.prototype, "periodFrom", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'period_to', type: 'date', nullable: true }),
    __metadata("design:type", String)
], RaBill.prototype, "periodTo", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', default: [] }),
    __metadata("design:type", Array)
], RaBill.prototype, "lineItems", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'gross_amount', type: 'decimal', precision: 15, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], RaBill.prototype, "grossAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'prev_billed', type: 'decimal', precision: 15, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], RaBill.prototype, "prevBilled", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'net_this_bill', type: 'decimal', precision: 15, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], RaBill.prototype, "netThisBill", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'gst_pct', type: 'decimal', precision: 5, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], RaBill.prototype, "gstPct", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'gst_amount', type: 'decimal', precision: 15, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], RaBill.prototype, "gstAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tds_pct', type: 'decimal', precision: 5, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], RaBill.prototype, "tdsPct", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tds_amount', type: 'decimal', precision: 15, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], RaBill.prototype, "tdsAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'security_deposit_pct', type: 'decimal', precision: 5, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], RaBill.prototype, "securityDepositPct", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'security_deposit_amount', type: 'decimal', precision: 15, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], RaBill.prototype, "securityDepositAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'net_payable', type: 'decimal', precision: 15, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], RaBill.prototype, "netPayable", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'amount_in_words', nullable: true }),
    __metadata("design:type", String)
], RaBill.prototype, "amountInWords", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: RaBillStatus, default: RaBillStatus.DRAFT }),
    __metadata("design:type", String)
], RaBill.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'submitted_date', type: 'date', nullable: true }),
    __metadata("design:type", String)
], RaBill.prototype, "submittedDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'approved_date', type: 'date', nullable: true }),
    __metadata("design:type", String)
], RaBill.prototype, "approvedDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'paid_date', type: 'date', nullable: true }),
    __metadata("design:type", String)
], RaBill.prototype, "paidDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'remarks', type: 'text', nullable: true }),
    __metadata("design:type", String)
], RaBill.prototype, "remarks", void 0);
exports.RaBill = RaBill = __decorate([
    (0, typeorm_1.Entity)('ra_bills')
], RaBill);
//# sourceMappingURL=ra-bill.entity.js.map