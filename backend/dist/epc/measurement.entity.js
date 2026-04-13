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
exports.Measurement = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("../shared/entities/base.entity");
let Measurement = class Measurement extends base_entity_1.BaseEntity {
    projectId;
    boqItemId;
    raBillId;
    mbNo;
    mbPage;
    date;
    location;
    entries;
    totalQty;
    measuredBy;
    checkedBy;
    remarks;
};
exports.Measurement = Measurement;
__decorate([
    (0, typeorm_1.Column)({ name: 'project_id' }),
    __metadata("design:type", String)
], Measurement.prototype, "projectId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'boq_item_id' }),
    __metadata("design:type", String)
], Measurement.prototype, "boqItemId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ra_bill_id', nullable: true }),
    __metadata("design:type", String)
], Measurement.prototype, "raBillId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'mb_no', nullable: true }),
    __metadata("design:type", String)
], Measurement.prototype, "mbNo", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'mb_page', nullable: true }),
    __metadata("design:type", String)
], Measurement.prototype, "mbPage", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date' }),
    __metadata("design:type", String)
], Measurement.prototype, "date", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], Measurement.prototype, "location", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', default: [] }),
    __metadata("design:type", Array)
], Measurement.prototype, "entries", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 15, scale: 3, default: 0 }),
    __metadata("design:type", Number)
], Measurement.prototype, "totalQty", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'measured_by', nullable: true }),
    __metadata("design:type", String)
], Measurement.prototype, "measuredBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'checked_by', nullable: true }),
    __metadata("design:type", String)
], Measurement.prototype, "checkedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Measurement.prototype, "remarks", void 0);
exports.Measurement = Measurement = __decorate([
    (0, typeorm_1.Entity)('measurements')
], Measurement);
//# sourceMappingURL=measurement.entity.js.map