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
exports.OmLog = exports.EFFLUENT_LIMITS = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("../shared/entities/base.entity");
exports.EFFLUENT_LIMITS = {
    outBod: 10,
    outCod: 50,
    outTss: 10,
    outPhMin: 6.5,
    outPhMax: 9.0,
    outFecalColiform: 100,
    outAmmN: 5,
    outTotalN: 10,
    outTotalP: 1,
};
let OmLog = class OmLog extends base_entity_1.BaseEntity {
    projectId;
    date;
    shift;
    inflowMld;
    outflowMld;
    inBod;
    inCod;
    inTss;
    outBod;
    outCod;
    outTss;
    outPh;
    outDo;
    outFecalColiform;
    outAmmN;
    outTotalN;
    outTotalP;
    mlss;
    svi;
    doAeration;
    chlorineResidual;
    powerKwh;
    dgHours;
    sludgeM3;
    operator;
    remarks;
};
exports.OmLog = OmLog;
__decorate([
    (0, typeorm_1.Column)({ name: 'project_id' }),
    __metadata("design:type", String)
], OmLog.prototype, "projectId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date' }),
    __metadata("design:type", String)
], OmLog.prototype, "date", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], OmLog.prototype, "shift", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'inflow_mld', type: 'decimal', precision: 8, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], OmLog.prototype, "inflowMld", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'outflow_mld', type: 'decimal', precision: 8, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], OmLog.prototype, "outflowMld", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'in_bod', type: 'decimal', precision: 8, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], OmLog.prototype, "inBod", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'in_cod', type: 'decimal', precision: 8, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], OmLog.prototype, "inCod", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'in_tss', type: 'decimal', precision: 8, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], OmLog.prototype, "inTss", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'out_bod', type: 'decimal', precision: 8, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], OmLog.prototype, "outBod", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'out_cod', type: 'decimal', precision: 8, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], OmLog.prototype, "outCod", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'out_tss', type: 'decimal', precision: 8, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], OmLog.prototype, "outTss", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'out_ph', type: 'decimal', precision: 4, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], OmLog.prototype, "outPh", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'out_do', type: 'decimal', precision: 6, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], OmLog.prototype, "outDo", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'out_fecal_coliform', type: 'decimal', precision: 12, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], OmLog.prototype, "outFecalColiform", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'out_amm_n', type: 'decimal', precision: 8, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], OmLog.prototype, "outAmmN", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'out_total_n', type: 'decimal', precision: 8, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], OmLog.prototype, "outTotalN", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'out_total_p', type: 'decimal', precision: 8, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], OmLog.prototype, "outTotalP", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], OmLog.prototype, "mlss", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], OmLog.prototype, "svi", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'do_aeration', type: 'decimal', precision: 6, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], OmLog.prototype, "doAeration", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'chlorine_residual', type: 'decimal', precision: 6, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], OmLog.prototype, "chlorineResidual", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'power_kwh', type: 'decimal', precision: 12, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], OmLog.prototype, "powerKwh", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'dg_hours', type: 'decimal', precision: 6, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], OmLog.prototype, "dgHours", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sludge_m3', type: 'decimal', precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], OmLog.prototype, "sludgeM3", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], OmLog.prototype, "operator", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], OmLog.prototype, "remarks", void 0);
exports.OmLog = OmLog = __decorate([
    (0, typeorm_1.Entity)('om_logs')
], OmLog);
//# sourceMappingURL=om-log.entity.js.map