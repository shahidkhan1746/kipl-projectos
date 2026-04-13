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
exports.Attendance = exports.AttendanceSource = exports.AttendanceStatus = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("../shared/entities/base.entity");
var AttendanceStatus;
(function (AttendanceStatus) {
    AttendanceStatus["PRESENT"] = "present";
    AttendanceStatus["ABSENT"] = "absent";
    AttendanceStatus["HALF_DAY"] = "half_day";
    AttendanceStatus["LEAVE"] = "leave";
    AttendanceStatus["HOLIDAY"] = "holiday";
})(AttendanceStatus || (exports.AttendanceStatus = AttendanceStatus = {}));
var AttendanceSource;
(function (AttendanceSource) {
    AttendanceSource["MOBILE"] = "mobile";
    AttendanceSource["MANUAL"] = "manual";
    AttendanceSource["BIOMETRIC"] = "biometric";
})(AttendanceSource || (exports.AttendanceSource = AttendanceSource = {}));
let Attendance = class Attendance extends base_entity_1.BaseEntity {
    employeeId;
    projectId;
    date;
    checkInTime;
    checkInLat;
    checkInLng;
    checkOutTime;
    checkOutLat;
    checkOutLng;
    hoursWorked;
    geoVerified;
    distanceFromSite;
    status;
    source;
    remarks;
};
exports.Attendance = Attendance;
__decorate([
    (0, typeorm_1.Column)({ name: 'employee_id' }),
    __metadata("design:type", String)
], Attendance.prototype, "employeeId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'project_id', nullable: true }),
    __metadata("design:type", String)
], Attendance.prototype, "projectId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date' }),
    __metadata("design:type", String)
], Attendance.prototype, "date", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'check_in_time', nullable: true }),
    __metadata("design:type", Date)
], Attendance.prototype, "checkInTime", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'check_in_lat', type: 'decimal', precision: 10, scale: 8, nullable: true }),
    __metadata("design:type", Number)
], Attendance.prototype, "checkInLat", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'check_in_lng', type: 'decimal', precision: 11, scale: 8, nullable: true }),
    __metadata("design:type", Number)
], Attendance.prototype, "checkInLng", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'check_out_time', nullable: true }),
    __metadata("design:type", Date)
], Attendance.prototype, "checkOutTime", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'check_out_lat', type: 'decimal', precision: 10, scale: 8, nullable: true }),
    __metadata("design:type", Number)
], Attendance.prototype, "checkOutLat", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'check_out_lng', type: 'decimal', precision: 11, scale: 8, nullable: true }),
    __metadata("design:type", Number)
], Attendance.prototype, "checkOutLng", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'hours_worked', type: 'decimal', precision: 5, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], Attendance.prototype, "hoursWorked", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'geo_verified', default: false }),
    __metadata("design:type", Boolean)
], Attendance.prototype, "geoVerified", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'distance_from_site', type: 'integer', nullable: true }),
    __metadata("design:type", Number)
], Attendance.prototype, "distanceFromSite", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: AttendanceStatus, default: AttendanceStatus.PRESENT }),
    __metadata("design:type", String)
], Attendance.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: AttendanceSource, default: AttendanceSource.MANUAL }),
    __metadata("design:type", String)
], Attendance.prototype, "source", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Attendance.prototype, "remarks", void 0);
exports.Attendance = Attendance = __decorate([
    (0, typeorm_1.Entity)('attendance')
], Attendance);
//# sourceMappingURL=attendance.entity.js.map