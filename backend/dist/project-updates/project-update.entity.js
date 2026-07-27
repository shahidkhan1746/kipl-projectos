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
exports.ProjectUpdate = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("../shared/entities/base.entity");
let ProjectUpdate = class ProjectUpdate extends base_entity_1.BaseEntity {
    projectId;
    date;
    title;
    description;
    category;
    photos;
    isPublished;
    createdBy;
};
exports.ProjectUpdate = ProjectUpdate;
__decorate([
    (0, typeorm_1.Column)({ name: 'project_id', type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], ProjectUpdate.prototype, "projectId", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: 'date' }),
    __metadata("design:type", String)
], ProjectUpdate.prototype, "date", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], ProjectUpdate.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', default: '' }),
    __metadata("design:type", String)
], ProjectUpdate.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'general' }),
    __metadata("design:type", String)
], ProjectUpdate.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', default: [] }),
    __metadata("design:type", Array)
], ProjectUpdate.prototype, "photos", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_published', default: true }),
    __metadata("design:type", Boolean)
], ProjectUpdate.prototype, "isPublished", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_by', type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], ProjectUpdate.prototype, "createdBy", void 0);
exports.ProjectUpdate = ProjectUpdate = __decorate([
    (0, typeorm_1.Entity)('project_updates')
], ProjectUpdate);
//# sourceMappingURL=project-update.entity.js.map