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
exports.Employee = exports.EmployeeStatus = exports.EmploymentType = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("../shared/entities/base.entity");
var EmploymentType;
(function (EmploymentType) {
    EmploymentType["FULL_TIME"] = "full_time";
    EmploymentType["CONTRACT"] = "contract";
    EmploymentType["DAILY_WAGE"] = "daily_wage";
})(EmploymentType || (exports.EmploymentType = EmploymentType = {}));
var EmployeeStatus;
(function (EmployeeStatus) {
    EmployeeStatus["ACTIVE"] = "active";
    EmployeeStatus["INACTIVE"] = "inactive";
    EmployeeStatus["TERMINATED"] = "terminated";
})(EmployeeStatus || (exports.EmployeeStatus = EmployeeStatus = {}));
let Employee = class Employee extends base_entity_1.BaseEntity {
    empCode;
    firstName;
    lastName;
    designation;
    labourCategory;
    department;
    phone;
    email;
    bloodGroup;
    emergencyName;
    emergencyPhone;
    dateOfJoining;
    dateOfBirth;
    aadharNo;
    panNo;
    bankAccount;
    baseSalary;
    hra;
    allowances;
    employmentType;
    status;
    projectId;
    photoUrl;
};
exports.Employee = Employee;
__decorate([
    (0, typeorm_1.Column)({ name: 'emp_code', unique: true, length: 20 }),
    __metadata("design:type", String)
], Employee.prototype, "empCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'first_name', length: 100 }),
    __metadata("design:type", String)
], Employee.prototype, "firstName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_name', nullable: true }),
    __metadata("design:type", String)
], Employee.prototype, "lastName", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Employee.prototype, "designation", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'labour_category', type: 'varchar', nullable: true }),
    __metadata("design:type", String)
], Employee.prototype, "labourCategory", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Employee.prototype, "department", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Employee.prototype, "phone", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Employee.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'blood_group', nullable: true }),
    __metadata("design:type", String)
], Employee.prototype, "bloodGroup", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'emergency_name', nullable: true }),
    __metadata("design:type", String)
], Employee.prototype, "emergencyName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'emergency_phone', nullable: true }),
    __metadata("design:type", String)
], Employee.prototype, "emergencyPhone", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'date_of_joining', type: 'date', nullable: true }),
    __metadata("design:type", String)
], Employee.prototype, "dateOfJoining", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'date_of_birth', type: 'date', nullable: true }),
    __metadata("design:type", String)
], Employee.prototype, "dateOfBirth", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'aadhar_no', nullable: true }),
    __metadata("design:type", String)
], Employee.prototype, "aadharNo", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'pan_no', nullable: true }),
    __metadata("design:type", String)
], Employee.prototype, "panNo", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'bank_account', type: 'jsonb', default: {} }),
    __metadata("design:type", Object)
], Employee.prototype, "bankAccount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'base_salary', type: 'decimal', precision: 10, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], Employee.prototype, "baseSalary", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'hra', type: 'decimal', precision: 10, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], Employee.prototype, "hra", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'allowances', type: 'decimal', precision: 10, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], Employee.prototype, "allowances", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'employment_type', type: 'enum', enum: EmploymentType, default: EmploymentType.CONTRACT }),
    __metadata("design:type", String)
], Employee.prototype, "employmentType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: EmployeeStatus, default: EmployeeStatus.ACTIVE }),
    __metadata("design:type", String)
], Employee.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'project_id', nullable: true }),
    __metadata("design:type", String)
], Employee.prototype, "projectId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'photo_url', nullable: true }),
    __metadata("design:type", String)
], Employee.prototype, "photoUrl", void 0);
exports.Employee = Employee = __decorate([
    (0, typeorm_1.Entity)('employees')
], Employee);
//# sourceMappingURL=employee.entity.js.map