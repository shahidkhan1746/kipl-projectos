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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LiaisonController = void 0;
const common_1 = require("@nestjs/common");
const liaison_service_1 = require("./liaison.service");
const create_file_dto_1 = require("./dto/create-file.dto");
const approve_file_dto_1 = require("./dto/approve-file.dto");
const create_letter_dto_1 = require("./dto/create-letter.dto");
const send_letter_dto_1 = require("./dto/send-letter.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const liaison_file_entity_1 = require("./liaison-file.entity");
let LiaisonController = class LiaisonController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    listFiles(q, req) {
        return this.svc.listFiles({
            projectId: q.projectId,
            status: q.status,
            priority: q.priority,
            department: q.department,
            fileType: q.fileType,
            page: q.page ? parseInt(q.page) : 1,
            limit: q.limit ? parseInt(q.limit) : 25,
            userId: req.user.id,
        });
    }
    createFile(dto, req) {
        return this.svc.createFile(dto, req.user.id);
    }
    getFile(id) {
        return this.svc.getFile(id);
    }
    approveFile(id, dto, req) {
        return this.svc.processApproval(id, dto, req.user.id, req.user.role);
    }
    async closeFile(id) {
        const file = await this.svc.getFile(id);
        file.currentStatus = liaison_file_entity_1.LiaisonStatus.CLOSED;
        return this.svc.fileRepo.save(file);
    }
    uploadDocument(fileId, body, req) {
        return this.svc.uploadDocument({
            fileId,
            uploadedById: req.user.id,
            documentName: body.documentName,
            cloudinaryUrl: body.cloudinaryUrl,
            cloudinaryPublicId: body.cloudinaryPublicId,
            fileSizeBytes: body.fileSizeBytes,
            mimeType: body.mimeType,
        });
    }
    listLetters(q) {
        return this.svc.listLetters({ projectId: q.projectId, letterType: q.letterType });
    }
    createLetter(dto, req) {
        return this.svc.createLetter(dto, req.user.id);
    }
    getLetter(id) {
        return this.svc.getLetter(id);
    }
    async downloadPdf(id, res) {
        const letter = await this.svc.getLetter(id);
        const pdf = await this.svc.generateLetterPdf(id);
        const fname = `${(letter.letterNumber ?? id).replace(/\//g, '-')}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${fname}"`);
        res.send(pdf);
    }
    sendLetter(id, dto) {
        return this.svc.sendLetterByEmail(id, dto);
    }
    dashboard(projectId) {
        return this.svc.dashboard(projectId);
    }
};
exports.LiaisonController = LiaisonController;
__decorate([
    (0, common_1.Get)('files'),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], LiaisonController.prototype, "listFiles", null);
__decorate([
    (0, common_1.Post)('files'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_file_dto_1.CreateFileDto, Object]),
    __metadata("design:returntype", void 0)
], LiaisonController.prototype, "createFile", null);
__decorate([
    (0, common_1.Get)('files/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], LiaisonController.prototype, "getFile", null);
__decorate([
    (0, common_1.Patch)('files/:id/approve'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, approve_file_dto_1.ApproveFileDto, Object]),
    __metadata("design:returntype", void 0)
], LiaisonController.prototype, "approveFile", null);
__decorate([
    (0, common_1.Patch)('files/:id/close'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LiaisonController.prototype, "closeFile", null);
__decorate([
    (0, common_1.Post)('files/:id/documents'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], LiaisonController.prototype, "uploadDocument", null);
__decorate([
    (0, common_1.Get)('letters'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], LiaisonController.prototype, "listLetters", null);
__decorate([
    (0, common_1.Post)('letters'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_letter_dto_1.CreateLetterDto, Object]),
    __metadata("design:returntype", void 0)
], LiaisonController.prototype, "createLetter", null);
__decorate([
    (0, common_1.Get)('letters/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], LiaisonController.prototype, "getLetter", null);
__decorate([
    (0, common_1.Get)('letters/:id/pdf'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], LiaisonController.prototype, "downloadPdf", null);
__decorate([
    (0, common_1.Post)('letters/:id/send'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, send_letter_dto_1.SendLetterDto]),
    __metadata("design:returntype", void 0)
], LiaisonController.prototype, "sendLetter", null);
__decorate([
    (0, common_1.Get)('dashboard'),
    __param(0, (0, common_1.Query)('projectId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], LiaisonController.prototype, "dashboard", null);
exports.LiaisonController = LiaisonController = __decorate([
    (0, common_1.Controller)('liaison'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [liaison_service_1.LiaisonService])
], LiaisonController);
//# sourceMappingURL=liaison.controller.js.map