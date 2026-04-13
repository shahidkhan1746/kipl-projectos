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
exports.FileDocument = exports.REVISIONS = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("../shared/entities/base.entity");
const liaison_file_entity_1 = require("./liaison-file.entity");
const user_entity_1 = require("../users/user.entity");
exports.REVISIONS = ['R0', 'R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8', 'R9'];
let FileDocument = class FileDocument extends base_entity_1.BaseEntity {
    file;
    fileId;
    documentName;
    revision;
    cloudinaryUrl;
    cloudinaryPublicId;
    fileSizeBytes;
    mimeType;
    uploadedBy;
    uploadedById;
    isCurrentRevision;
    uploadedAt;
};
exports.FileDocument = FileDocument;
__decorate([
    (0, typeorm_1.ManyToOne)(() => liaison_file_entity_1.LiaisonFile, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'file_id' }),
    __metadata("design:type", liaison_file_entity_1.LiaisonFile)
], FileDocument.prototype, "file", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'file_id' }),
    __metadata("design:type", String)
], FileDocument.prototype, "fileId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'document_name', nullable: true }),
    __metadata("design:type", String)
], FileDocument.prototype, "documentName", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 5, default: 'R0' }),
    __metadata("design:type", String)
], FileDocument.prototype, "revision", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'cloudinary_url', type: 'text' }),
    __metadata("design:type", String)
], FileDocument.prototype, "cloudinaryUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'cloudinary_public_id', nullable: true }),
    __metadata("design:type", String)
], FileDocument.prototype, "cloudinaryPublicId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'file_size_bytes', nullable: true }),
    __metadata("design:type", Number)
], FileDocument.prototype, "fileSizeBytes", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'mime_type', nullable: true }),
    __metadata("design:type", String)
], FileDocument.prototype, "mimeType", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User),
    (0, typeorm_1.JoinColumn)({ name: 'uploaded_by' }),
    __metadata("design:type", user_entity_1.User)
], FileDocument.prototype, "uploadedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'uploaded_by' }),
    __metadata("design:type", String)
], FileDocument.prototype, "uploadedById", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_current_revision', default: true }),
    __metadata("design:type", Boolean)
], FileDocument.prototype, "isCurrentRevision", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'uploaded_at', default: () => 'NOW()' }),
    __metadata("design:type", Date)
], FileDocument.prototype, "uploadedAt", void 0);
exports.FileDocument = FileDocument = __decorate([
    (0, typeorm_1.Entity)('file_documents')
], FileDocument);
//# sourceMappingURL=file-document.entity.js.map