"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HrModule = void 0;
const common_1 = require("@nestjs/common");
const users_module_1 = require("../users/users.module");
const typeorm_1 = require("@nestjs/typeorm");
const employee_entity_1 = require("./employee.entity");
const attendance_entity_1 = require("./attendance.entity");
const salary_record_entity_1 = require("./salary-record.entity");
const leave_request_entity_1 = require("./leave-request.entity");
const timesheet_entity_1 = require("./timesheet.entity");
const hr_service_1 = require("./hr.service");
const hr_controller_1 = require("./hr.controller");
let HrModule = class HrModule {
};
exports.HrModule = HrModule;
exports.HrModule = HrModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([employee_entity_1.Employee, attendance_entity_1.Attendance, salary_record_entity_1.SalaryRecord, leave_request_entity_1.LeaveRequest, timesheet_entity_1.Timesheet]), users_module_1.UsersModule],
        providers: [hr_service_1.HrService],
        controllers: [hr_controller_1.HrController],
        exports: [hr_service_1.HrService],
    })
], HrModule);
//# sourceMappingURL=hr.module.js.map