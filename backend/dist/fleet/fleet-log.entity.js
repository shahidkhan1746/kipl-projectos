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
exports.FleetLog = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("../shared/entities/base.entity");
let FleetLog = class FleetLog extends base_entity_1.BaseEntity {
    projectId;
    logType;
    date;
    vehicle;
    driver;
    meterStart;
    meterEnd;
    distanceKm;
    passengerName;
    passengerDesignation;
    purpose;
    fromLocation;
    toLocation;
    machineId;
    machineType;
    operator;
    hourStart;
    hourClose;
    hoursWorked;
    workZone;
    workDescription;
    breakdown;
    breakdownDetails;
    fuelLitres;
    fuelCost;
    remarks;
    reportedBy;
    reportedVia;
    photoUrl;
};
exports.FleetLog = FleetLog;
__decorate([
    (0, typeorm_1.Column)({ name: 'project_id' }),
    __metadata("design:type", String)
], FleetLog.prototype, "projectId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'log_type' }),
    __metadata("design:type", String)
], FleetLog.prototype, "logType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date' }),
    __metadata("design:type", String)
], FleetLog.prototype, "date", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], FleetLog.prototype, "vehicle", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], FleetLog.prototype, "driver", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'meter_start', type: 'decimal', precision: 10, scale: 1, nullable: true }),
    __metadata("design:type", Number)
], FleetLog.prototype, "meterStart", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'meter_end', type: 'decimal', precision: 10, scale: 1, nullable: true }),
    __metadata("design:type", Number)
], FleetLog.prototype, "meterEnd", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'distance_km', type: 'decimal', precision: 10, scale: 1, nullable: true }),
    __metadata("design:type", Number)
], FleetLog.prototype, "distanceKm", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'passenger_name', nullable: true }),
    __metadata("design:type", String)
], FleetLog.prototype, "passengerName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'passenger_designation', nullable: true }),
    __metadata("design:type", String)
], FleetLog.prototype, "passengerDesignation", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], FleetLog.prototype, "purpose", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'from_location', nullable: true }),
    __metadata("design:type", String)
], FleetLog.prototype, "fromLocation", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'to_location', nullable: true }),
    __metadata("design:type", String)
], FleetLog.prototype, "toLocation", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'machine_id', nullable: true }),
    __metadata("design:type", String)
], FleetLog.prototype, "machineId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'machine_type', nullable: true }),
    __metadata("design:type", String)
], FleetLog.prototype, "machineType", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], FleetLog.prototype, "operator", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'hour_start', type: 'decimal', precision: 10, scale: 1, nullable: true }),
    __metadata("design:type", Number)
], FleetLog.prototype, "hourStart", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'hour_close', type: 'decimal', precision: 10, scale: 1, nullable: true }),
    __metadata("design:type", Number)
], FleetLog.prototype, "hourClose", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'hours_worked', type: 'decimal', precision: 10, scale: 1, nullable: true }),
    __metadata("design:type", Number)
], FleetLog.prototype, "hoursWorked", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'work_zone', nullable: true }),
    __metadata("design:type", String)
], FleetLog.prototype, "workZone", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'work_description', type: 'text', nullable: true }),
    __metadata("design:type", String)
], FleetLog.prototype, "workDescription", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'breakdown', default: false }),
    __metadata("design:type", Boolean)
], FleetLog.prototype, "breakdown", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'breakdown_details', type: 'text', nullable: true }),
    __metadata("design:type", String)
], FleetLog.prototype, "breakdownDetails", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'fuel_litres', type: 'decimal', precision: 10, scale: 1, nullable: true }),
    __metadata("design:type", Number)
], FleetLog.prototype, "fuelLitres", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'fuel_cost', type: 'decimal', precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], FleetLog.prototype, "fuelCost", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], FleetLog.prototype, "remarks", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'reported_by', nullable: true }),
    __metadata("design:type", String)
], FleetLog.prototype, "reportedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'reported_via', default: 'manual' }),
    __metadata("design:type", String)
], FleetLog.prototype, "reportedVia", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'photo_url', nullable: true }),
    __metadata("design:type", String)
], FleetLog.prototype, "photoUrl", void 0);
exports.FleetLog = FleetLog = __decorate([
    (0, typeorm_1.Entity)('fleet_logs')
], FleetLog);
//# sourceMappingURL=fleet-log.entity.js.map