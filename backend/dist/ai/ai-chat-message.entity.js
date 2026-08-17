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
exports.AiChatMessage = void 0;
const typeorm_1 = require("typeorm");
const ai_chat_session_entity_1 = require("./ai-chat-session.entity");
let AiChatMessage = class AiChatMessage {
    id;
    sessionId;
    session;
    role;
    content;
    createdAt;
};
exports.AiChatMessage = AiChatMessage;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], AiChatMessage.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], AiChatMessage.prototype, "sessionId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => ai_chat_session_entity_1.AiChatSession, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'sessionId' }),
    __metadata("design:type", ai_chat_session_entity_1.AiChatSession)
], AiChatMessage.prototype, "session", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], AiChatMessage.prototype, "role", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], AiChatMessage.prototype, "content", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], AiChatMessage.prototype, "createdAt", void 0);
exports.AiChatMessage = AiChatMessage = __decorate([
    (0, typeorm_1.Entity)('ai_chat_messages')
], AiChatMessage);
//# sourceMappingURL=ai-chat-message.entity.js.map