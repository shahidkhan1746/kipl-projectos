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
exports.OmPmTask = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("../shared/entities/base.entity");
let OmPmTask = class OmPmTask extends base_entity_1.BaseEntity {
    projectId;
    equipment;
    task;
    frequencyDays;
    lastDone;
    responsible;
    remarks;
    active;
};
exports.OmPmTask = OmPmTask;
__decorate([
    (0, typeorm_1.Column)({ name: 'project_id' }),
    __metadata("design:type", String)
], OmPmTask.prototype, "projectId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], OmPmTask.prototype, "equipment", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], OmPmTask.prototype, "task", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'frequency_days', type: 'int', default: 30 }),
    __metadata("design:type", Number)
], OmPmTask.prototype, "frequencyDays", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_done', type: 'date', nullable: true }),
    __metadata("design:type", String)
], OmPmTask.prototype, "lastDone", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], OmPmTask.prototype, "responsible", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], OmPmTask.prototype, "remarks", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], OmPmTask.prototype, "active", void 0);
exports.OmPmTask = OmPmTask = __decorate([
    (0, typeorm_1.Entity)('om_pm_tasks')
], OmPmTask);
//# sourceMappingURL=om-pm-task.entity.js.map