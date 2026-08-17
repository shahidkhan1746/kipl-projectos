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
exports.AiKnowledgeDocument = exports.KnowledgeStatus = exports.KnowledgeSourceType = exports.KnowledgeCategory = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("../shared/entities/base.entity");
var KnowledgeCategory;
(function (KnowledgeCategory) {
    KnowledgeCategory["CONTRACT"] = "contract";
    KnowledgeCategory["TENDER"] = "tender";
    KnowledgeCategory["BOQ"] = "boq";
    KnowledgeCategory["TECHNICAL_SPEC"] = "technical_spec";
    KnowledgeCategory["DRAWING"] = "drawing";
    KnowledgeCategory["VENDOR_APPROVAL"] = "vendor_approval";
    KnowledgeCategory["LIAISON_APPROVAL"] = "liaison_approval";
    KnowledgeCategory["MOM_MEETING"] = "mom_meeting";
    KnowledgeCategory["SITE_REPORT"] = "site_report";
    KnowledgeCategory["LEGAL_EOT"] = "legal_eot";
    KnowledgeCategory["OTHER"] = "other";
})(KnowledgeCategory || (exports.KnowledgeCategory = KnowledgeCategory = {}));
var KnowledgeSourceType;
(function (KnowledgeSourceType) {
    KnowledgeSourceType["DIRECT_UPLOAD"] = "direct_upload";
    KnowledgeSourceType["LIAISON_FETCH"] = "liaison_fetch";
    KnowledgeSourceType["SYSTEM_SYNC"] = "system_sync";
})(KnowledgeSourceType || (exports.KnowledgeSourceType = KnowledgeSourceType = {}));
var KnowledgeStatus;
(function (KnowledgeStatus) {
    KnowledgeStatus["INDEXED"] = "indexed";
    KnowledgeStatus["PROCESSING"] = "processing";
    KnowledgeStatus["FAILED"] = "failed";
})(KnowledgeStatus || (exports.KnowledgeStatus = KnowledgeStatus = {}));
let AiKnowledgeDocument = class AiKnowledgeDocument extends base_entity_1.BaseEntity {
    projectId;
    documentName;
    category;
    fileUrl;
    fileSizeBytes;
    mimeType;
    sourceType;
    sourceId;
    totalChunks;
    status;
    errorMessage;
    uploadedBy;
};
exports.AiKnowledgeDocument = AiKnowledgeDocument;
__decorate([
    (0, typeorm_1.Column)({ name: 'project_id', nullable: true }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], AiKnowledgeDocument.prototype, "projectId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'document_name' }),
    __metadata("design:type", String)
], AiKnowledgeDocument.prototype, "documentName", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: KnowledgeCategory,
        default: KnowledgeCategory.OTHER,
    }),
    __metadata("design:type", String)
], AiKnowledgeDocument.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'file_url', type: 'text', nullable: true }),
    __metadata("design:type", String)
], AiKnowledgeDocument.prototype, "fileUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'file_size_bytes', type: 'bigint', nullable: true }),
    __metadata("design:type", Number)
], AiKnowledgeDocument.prototype, "fileSizeBytes", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'mime_type', nullable: true }),
    __metadata("design:type", String)
], AiKnowledgeDocument.prototype, "mimeType", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'source_type',
        type: 'enum',
        enum: KnowledgeSourceType,
        default: KnowledgeSourceType.DIRECT_UPLOAD,
    }),
    __metadata("design:type", String)
], AiKnowledgeDocument.prototype, "sourceType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'source_id', nullable: true }),
    __metadata("design:type", String)
], AiKnowledgeDocument.prototype, "sourceId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'total_chunks', default: 0 }),
    __metadata("design:type", Number)
], AiKnowledgeDocument.prototype, "totalChunks", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: KnowledgeStatus,
        default: KnowledgeStatus.PROCESSING,
    }),
    __metadata("design:type", String)
], AiKnowledgeDocument.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'error_message', type: 'text', nullable: true }),
    __metadata("design:type", Object)
], AiKnowledgeDocument.prototype, "errorMessage", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'uploaded_by', nullable: true }),
    __metadata("design:type", String)
], AiKnowledgeDocument.prototype, "uploadedBy", void 0);
exports.AiKnowledgeDocument = AiKnowledgeDocument = __decorate([
    (0, typeorm_1.Entity)('ai_knowledge_documents')
], AiKnowledgeDocument);
//# sourceMappingURL=ai-knowledge-document.entity.js.map