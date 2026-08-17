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
exports.AiDocumentChunk = void 0;
const typeorm_1 = require("typeorm");
let AiDocumentChunk = class AiDocumentChunk {
    id;
    projectId;
    sourceId;
    sourceType;
    sourceName;
    text;
    embedding;
    createdAt;
};
exports.AiDocumentChunk = AiDocumentChunk;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], AiDocumentChunk.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Object)
], AiDocumentChunk.prototype, "projectId", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Object)
], AiDocumentChunk.prototype, "sourceId", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Object)
], AiDocumentChunk.prototype, "sourceType", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Object)
], AiDocumentChunk.prototype, "sourceName", void 0);
__decorate([
    (0, typeorm_1.Column)('text'),
    __metadata("design:type", String)
], AiDocumentChunk.prototype, "text", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'vector', length: 768, nullable: true }),
    __metadata("design:type", Object)
], AiDocumentChunk.prototype, "embedding", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], AiDocumentChunk.prototype, "createdAt", void 0);
exports.AiDocumentChunk = AiDocumentChunk = __decorate([
    (0, typeorm_1.Entity)('ai_document_chunks')
], AiDocumentChunk);
//# sourceMappingURL=ai-document-chunk.entity.js.map