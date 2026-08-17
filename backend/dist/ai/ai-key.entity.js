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
exports.AiKey = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("../shared/entities/base.entity");
let AiKey = class AiKey extends base_entity_1.BaseEntity {
    label;
    provider;
    apiKey;
    model;
    baseUrl;
    enabled;
    priority;
};
exports.AiKey = AiKey;
__decorate([
    (0, typeorm_1.Column)({ default: '' }),
    __metadata("design:type", String)
], AiKey.prototype, "label", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'nvidia' }),
    __metadata("design:type", String)
], AiKey.prototype, "provider", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'api_key', type: 'text', nullable: true }),
    __metadata("design:type", String)
], AiKey.prototype, "apiKey", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], AiKey.prototype, "model", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'base_url', nullable: true }),
    __metadata("design:type", String)
], AiKey.prototype, "baseUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], AiKey.prototype, "enabled", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 100 }),
    __metadata("design:type", Number)
], AiKey.prototype, "priority", void 0);
exports.AiKey = AiKey = __decorate([
    (0, typeorm_1.Entity)('ai_keys')
], AiKey);
//# sourceMappingURL=ai-key.entity.js.map