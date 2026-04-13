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
exports.BoqItem = exports.BoqCategory = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("../shared/entities/base.entity");
var BoqCategory;
(function (BoqCategory) {
    BoqCategory["SEWER_NETWORK"] = "sewer_network";
    BoqCategory["IPS_CIVIL"] = "ips_civil";
    BoqCategory["IPS_EM"] = "ips_em";
    BoqCategory["STP_CIVIL"] = "stp_civil";
    BoqCategory["STP_EM"] = "stp_em";
    BoqCategory["RISING_MAIN"] = "rising_main";
    BoqCategory["ROAD_WORK"] = "road_work";
    BoqCategory["OTHER"] = "other";
})(BoqCategory || (exports.BoqCategory = BoqCategory = {}));
let BoqItem = class BoqItem extends base_entity_1.BaseEntity {
    projectId;
    slNo;
    sorRef;
    description;
    unit;
    category;
    subCategory;
    estimatedQty;
    rate;
    estimatedAmount;
    quotedRate;
    quotedAmount;
    measuredQty;
    measuredAmount;
    paymentMilestone;
    paymentPct;
    isActive;
};
exports.BoqItem = BoqItem;
__decorate([
    (0, typeorm_1.Column)({ name: 'project_id' }),
    __metadata("design:type", String)
], BoqItem.prototype, "projectId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sl_no', nullable: true }),
    __metadata("design:type", String)
], BoqItem.prototype, "slNo", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sor_ref', nullable: true }),
    __metadata("design:type", String)
], BoqItem.prototype, "sorRef", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], BoqItem.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], BoqItem.prototype, "unit", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: BoqCategory, default: BoqCategory.SEWER_NETWORK }),
    __metadata("design:type", String)
], BoqItem.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sub_category', nullable: true }),
    __metadata("design:type", String)
], BoqItem.prototype, "subCategory", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 15, scale: 3, default: 0 }),
    __metadata("design:type", Number)
], BoqItem.prototype, "estimatedQty", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 15, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], BoqItem.prototype, "rate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'estimated_amount', type: 'decimal', precision: 15, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], BoqItem.prototype, "estimatedAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'quoted_rate', type: 'decimal', precision: 15, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], BoqItem.prototype, "quotedRate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'quoted_amount', type: 'decimal', precision: 15, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], BoqItem.prototype, "quotedAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'measured_qty', type: 'decimal', precision: 15, scale: 3, default: 0 }),
    __metadata("design:type", Number)
], BoqItem.prototype, "measuredQty", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'measured_amount', type: 'decimal', precision: 15, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], BoqItem.prototype, "measuredAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'payment_milestone', nullable: true }),
    __metadata("design:type", String)
], BoqItem.prototype, "paymentMilestone", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'payment_pct', type: 'decimal', precision: 5, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], BoqItem.prototype, "paymentPct", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_active', default: true }),
    __metadata("design:type", Boolean)
], BoqItem.prototype, "isActive", void 0);
exports.BoqItem = BoqItem = __decorate([
    (0, typeorm_1.Entity)('boq_items')
], BoqItem);
//# sourceMappingURL=boq-item.entity.js.map