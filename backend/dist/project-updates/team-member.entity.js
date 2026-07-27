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
exports.TeamMember = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("../shared/entities/base.entity");
let TeamMember = class TeamMember extends base_entity_1.BaseEntity {
    name;
    title;
    department;
    photoUrl;
    photoKey;
    bio;
    sortOrder;
    isPublished;
};
exports.TeamMember = TeamMember;
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], TeamMember.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: '' }),
    __metadata("design:type", String)
], TeamMember.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: '' }),
    __metadata("design:type", String)
], TeamMember.prototype, "department", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'photo_url', type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], TeamMember.prototype, "photoUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'photo_key', type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], TeamMember.prototype, "photoKey", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', default: '' }),
    __metadata("design:type", String)
], TeamMember.prototype, "bio", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sort_order', default: 0 }),
    __metadata("design:type", Number)
], TeamMember.prototype, "sortOrder", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_published', default: true }),
    __metadata("design:type", Boolean)
], TeamMember.prototype, "isPublished", void 0);
exports.TeamMember = TeamMember = __decorate([
    (0, typeorm_1.Entity)('team_members')
], TeamMember);
//# sourceMappingURL=team-member.entity.js.map