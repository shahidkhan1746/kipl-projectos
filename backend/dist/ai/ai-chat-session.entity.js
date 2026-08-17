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
exports.AiChatSession = void 0;
const typeorm_1 = require("typeorm");
let AiChatSession = class AiChatSession {
    id;
    title;
    userId;
    projectId;
    createdAt;
    updatedAt;
};
exports.AiChatSession = AiChatSession;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], AiChatSession.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'New Chat' }),
    __metadata("design:type", String)
], AiChatSession.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], AiChatSession.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], AiChatSession.prototype, "projectId", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], AiChatSession.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], AiChatSession.prototype, "updatedAt", void 0);
exports.AiChatSession = AiChatSession = __decorate([
    (0, typeorm_1.Entity)('ai_chat_sessions')
], AiChatSession);
//# sourceMappingURL=ai-chat-session.entity.js.map