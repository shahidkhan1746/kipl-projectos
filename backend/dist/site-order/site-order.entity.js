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
exports.SiteOrder = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("../shared/entities/base.entity");
let SiteOrder = class SiteOrder extends base_entity_1.BaseEntity {
    projectId;
    orderNo;
    date;
    issuedBy;
    instruction;
    acknowledgedBy;
    acknowledgedDate;
    complianceStatus;
    remarks;
};
exports.SiteOrder = SiteOrder;
__decorate([
    (0, typeorm_1.Column)({ name: 'project_id' }),
    __metadata("design:type", String)
], SiteOrder.prototype, "projectId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'order_no', nullable: true }),
    __metadata("design:type", String)
], SiteOrder.prototype, "orderNo", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date' }),
    __metadata("design:type", String)
], SiteOrder.prototype, "date", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'issued_by' }),
    __metadata("design:type", String)
], SiteOrder.prototype, "issuedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], SiteOrder.prototype, "instruction", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'acknowledged_by', nullable: true }),
    __metadata("design:type", String)
], SiteOrder.prototype, "acknowledgedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'acknowledged_date', type: 'date', nullable: true }),
    __metadata("design:type", String)
], SiteOrder.prototype, "acknowledgedDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'compliance_status', default: 'pending' }),
    __metadata("design:type", String)
], SiteOrder.prototype, "complianceStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], SiteOrder.prototype, "remarks", void 0);
exports.SiteOrder = SiteOrder = __decorate([
    (0, typeorm_1.Entity)('site_orders')
], SiteOrder);
//# sourceMappingURL=site-order.entity.js.map