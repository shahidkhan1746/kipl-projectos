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
exports.QaChecklist = exports.ChecklistCategory = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("../shared/entities/base.entity");
var ChecklistCategory;
(function (ChecklistCategory) {
    ChecklistCategory["SEWER_NETWORK"] = "sewer_network";
    ChecklistCategory["MANHOLE"] = "manhole";
    ChecklistCategory["PIPE_LAYING"] = "pipe_laying";
    ChecklistCategory["EARTHWORK"] = "earthwork";
    ChecklistCategory["CONCRETE"] = "concrete";
    ChecklistCategory["IPS_CIVIL"] = "ips_civil";
    ChecklistCategory["IPS_EM"] = "ips_em";
    ChecklistCategory["STP"] = "stp";
    ChecklistCategory["ROAD_RESTORATION"] = "road_restoration";
    ChecklistCategory["TESTING"] = "testing";
    ChecklistCategory["MATERIAL"] = "material";
    ChecklistCategory["SAFETY"] = "safety";
})(ChecklistCategory || (exports.ChecklistCategory = ChecklistCategory = {}));
let QaChecklist = class QaChecklist extends base_entity_1.BaseEntity {
    projectId;
    title;
    category;
    workItem;
    isTemplate;
    items;
    isActive;
};
exports.QaChecklist = QaChecklist;
__decorate([
    (0, typeorm_1.Column)({ name: 'project_id' }),
    __metadata("design:type", String)
], QaChecklist.prototype, "projectId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], QaChecklist.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ChecklistCategory }),
    __metadata("design:type", String)
], QaChecklist.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'work_item', nullable: true }),
    __metadata("design:type", String)
], QaChecklist.prototype, "workItem", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_template', default: false }),
    __metadata("design:type", Boolean)
], QaChecklist.prototype, "isTemplate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', default: [] }),
    __metadata("design:type", Array)
], QaChecklist.prototype, "items", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_active', default: true }),
    __metadata("design:type", Boolean)
], QaChecklist.prototype, "isActive", void 0);
exports.QaChecklist = QaChecklist = __decorate([
    (0, typeorm_1.Entity)('qa_checklists')
], QaChecklist);
//# sourceMappingURL=qa-checklist.entity.js.map