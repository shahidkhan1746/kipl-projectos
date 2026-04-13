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
exports.MarkAttendanceDto = void 0;
const class_validator_1 = require("class-validator");
const attendance_entity_1 = require("../attendance.entity");
class MarkAttendanceDto {
    employeeId;
    date;
    status;
    source;
    checkInLat;
    checkInLng;
    checkInTime;
    checkOutTime;
    remarks;
    projectId;
}
exports.MarkAttendanceDto = MarkAttendanceDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], MarkAttendanceDto.prototype, "employeeId", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], MarkAttendanceDto.prototype, "date", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(attendance_entity_1.AttendanceStatus),
    __metadata("design:type", String)
], MarkAttendanceDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(attendance_entity_1.AttendanceSource),
    __metadata("design:type", String)
], MarkAttendanceDto.prototype, "source", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], MarkAttendanceDto.prototype, "checkInLat", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], MarkAttendanceDto.prototype, "checkInLng", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], MarkAttendanceDto.prototype, "checkInTime", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], MarkAttendanceDto.prototype, "checkOutTime", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], MarkAttendanceDto.prototype, "remarks", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], MarkAttendanceDto.prototype, "projectId", void 0);
//# sourceMappingURL=mark-attendance.dto.js.map