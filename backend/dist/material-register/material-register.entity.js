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
exports.MaterialRegister = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("../shared/entities/base.entity");
let MaterialRegister = class MaterialRegister extends base_entity_1.BaseEntity {
    projectId;
    date;
    material;
    unit;
    receivedQty;
    consumedQty;
    contractorRep;
    ueedRep;
    remarks;
};
exports.MaterialRegister = MaterialRegister;
__decorate([
    (0, typeorm_1.Column)({ name: 'project_id' }),
    __metadata("design:type", String)
], MaterialRegister.prototype, "projectId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date' }),
    __metadata("design:type", String)
], MaterialRegister.prototype, "date", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], MaterialRegister.prototype, "material", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], MaterialRegister.prototype, "unit", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'received_qty', type: 'decimal', precision: 12, scale: 3, default: 0 }),
    __metadata("design:type", Number)
], MaterialRegister.prototype, "receivedQty", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'consumed_qty', type: 'decimal', precision: 12, scale: 3, default: 0 }),
    __metadata("design:type", Number)
], MaterialRegister.prototype, "consumedQty", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'contractor_rep', nullable: true }),
    __metadata("design:type", String)
], MaterialRegister.prototype, "contractorRep", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ueed_rep', nullable: true }),
    __metadata("design:type", String)
], MaterialRegister.prototype, "ueedRep", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], MaterialRegister.prototype, "remarks", void 0);
exports.MaterialRegister = MaterialRegister = __decorate([
    (0, typeorm_1.Entity)('material_register')
], MaterialRegister);
//# sourceMappingURL=material-register.entity.js.map