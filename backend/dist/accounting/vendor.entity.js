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
exports.Vendor = exports.VendorCategory = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("../shared/entities/base.entity");
var VendorCategory;
(function (VendorCategory) {
    VendorCategory["MATERIAL_SUPPLIER"] = "material_supplier";
    VendorCategory["SUBCONTRACTOR"] = "subcontractor";
    VendorCategory["EQUIPMENT_HIRE"] = "equipment_hire";
    VendorCategory["LABOUR_CONTRACTOR"] = "labour_contractor";
    VendorCategory["CONSULTANT"] = "consultant";
    VendorCategory["GOVERNMENT"] = "government";
    VendorCategory["OTHER"] = "other";
})(VendorCategory || (exports.VendorCategory = VendorCategory = {}));
let Vendor = class Vendor extends base_entity_1.BaseEntity {
    name;
    tradeName;
    category;
    gstin;
    pan;
    phone;
    email;
    address;
    bankAccount;
    tdsApplicable;
    tdsRate;
    isActive;
    projectId;
};
exports.Vendor = Vendor;
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Vendor.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'trade_name', nullable: true }),
    __metadata("design:type", String)
], Vendor.prototype, "tradeName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: VendorCategory, default: VendorCategory.OTHER }),
    __metadata("design:type", String)
], Vendor.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Vendor.prototype, "gstin", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Vendor.prototype, "pan", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Vendor.prototype, "phone", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Vendor.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Vendor.prototype, "address", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'bank_account', type: 'jsonb', default: {} }),
    __metadata("design:type", Object)
], Vendor.prototype, "bankAccount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tds_applicable', default: true }),
    __metadata("design:type", Boolean)
], Vendor.prototype, "tdsApplicable", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tds_rate', type: 'decimal', precision: 5, scale: 2, default: 2 }),
    __metadata("design:type", Number)
], Vendor.prototype, "tdsRate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_active', default: true }),
    __metadata("design:type", Boolean)
], Vendor.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'project_id', nullable: true }),
    __metadata("design:type", String)
], Vendor.prototype, "projectId", void 0);
exports.Vendor = Vendor = __decorate([
    (0, typeorm_1.Entity)('vendors')
], Vendor);
//# sourceMappingURL=vendor.entity.js.map