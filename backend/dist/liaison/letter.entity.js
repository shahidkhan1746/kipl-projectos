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
exports.Letter = exports.LetterStatus = exports.LetterType = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("../shared/entities/base.entity");
const project_entity_1 = require("../projects/project.entity");
const liaison_file_entity_1 = require("./liaison-file.entity");
const user_entity_1 = require("../users/user.entity");
var LetterType;
(function (LetterType) {
    LetterType["OUTGOING"] = "outgoing";
    LetterType["INCOMING"] = "incoming";
    LetterType["INTERNAL"] = "internal";
})(LetterType || (exports.LetterType = LetterType = {}));
var LetterStatus;
(function (LetterStatus) {
    LetterStatus["DRAFT"] = "draft";
    LetterStatus["GENERATED"] = "generated";
    LetterStatus["DISPATCHED"] = "dispatched";
})(LetterStatus || (exports.LetterStatus = LetterStatus = {}));
let Letter = class Letter extends base_entity_1.BaseEntity {
    project;
    projectId;
    file;
    fileId;
    letterNumber;
    letterType;
    toName;
    toOrganization;
    toEmail;
    subject;
    body;
    date;
    signedBy;
    signedById;
    pdfUrl;
    pdfPublicId;
    status;
    dispatchedAt;
    gmailMessageId;
    emailSubject;
};
exports.Letter = Letter;
__decorate([
    (0, typeorm_1.ManyToOne)(() => project_entity_1.Project),
    (0, typeorm_1.JoinColumn)({ name: 'project_id' }),
    __metadata("design:type", project_entity_1.Project)
], Letter.prototype, "project", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'project_id' }),
    __metadata("design:type", String)
], Letter.prototype, "projectId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => liaison_file_entity_1.LiaisonFile, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'file_id' }),
    __metadata("design:type", liaison_file_entity_1.LiaisonFile)
], Letter.prototype, "file", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'file_id', nullable: true }),
    __metadata("design:type", String)
], Letter.prototype, "fileId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'letter_number', unique: true, nullable: true }),
    __metadata("design:type", String)
], Letter.prototype, "letterNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'letter_type', type: 'enum', enum: LetterType, default: LetterType.OUTGOING }),
    __metadata("design:type", String)
], Letter.prototype, "letterType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'to_name', nullable: true }),
    __metadata("design:type", String)
], Letter.prototype, "toName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'to_organization', nullable: true }),
    __metadata("design:type", String)
], Letter.prototype, "toOrganization", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'to_email', nullable: true }),
    __metadata("design:type", String)
], Letter.prototype, "toEmail", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Letter.prototype, "subject", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Letter.prototype, "body", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date', default: () => 'CURRENT_DATE' }),
    __metadata("design:type", String)
], Letter.prototype, "date", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'signed_by' }),
    __metadata("design:type", user_entity_1.User)
], Letter.prototype, "signedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'signed_by', nullable: true }),
    __metadata("design:type", String)
], Letter.prototype, "signedById", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'pdf_url', nullable: true }),
    __metadata("design:type", String)
], Letter.prototype, "pdfUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'pdf_public_id', nullable: true }),
    __metadata("design:type", String)
], Letter.prototype, "pdfPublicId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: LetterStatus, default: LetterStatus.DRAFT }),
    __metadata("design:type", String)
], Letter.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'dispatched_at', nullable: true }),
    __metadata("design:type", Date)
], Letter.prototype, "dispatchedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'gmail_message_id', nullable: true }),
    __metadata("design:type", String)
], Letter.prototype, "gmailMessageId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'email_subject', nullable: true }),
    __metadata("design:type", String)
], Letter.prototype, "emailSubject", void 0);
exports.Letter = Letter = __decorate([
    (0, typeorm_1.Entity)('letters')
], Letter);
//# sourceMappingURL=letter.entity.js.map