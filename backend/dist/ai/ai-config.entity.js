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
exports.AiConfig = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("../shared/entities/base.entity");
let AiConfig = class AiConfig extends base_entity_1.BaseEntity {
    enabled;
    provider;
    apiKey;
    model;
    baseUrl;
};
exports.AiConfig = AiConfig;
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], AiConfig.prototype, "enabled", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'gemini' }),
    __metadata("design:type", String)
], AiConfig.prototype, "provider", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'api_key', type: 'text', nullable: true }),
    __metadata("design:type", String)
], AiConfig.prototype, "apiKey", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], AiConfig.prototype, "model", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'base_url', nullable: true }),
    __metadata("design:type", String)
], AiConfig.prototype, "baseUrl", void 0);
exports.AiConfig = AiConfig = __decorate([
    (0, typeorm_1.Entity)('ai_config')
], AiConfig);
//# sourceMappingURL=ai-config.entity.js.map