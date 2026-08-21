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
exports.AiController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const ai_service_1 = require("./ai.service");
const ai_indexer_service_1 = require("./ai-indexer.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const user_entity_1 = require("../users/user.entity");
const ai_access_guard_1 = require("./ai-access.guard");
const ai_knowledge_document_entity_1 = require("./ai-knowledge-document.entity");
let AiController = class AiController {
    svc;
    indexer;
    constructor(svc, indexer) {
        this.svc = svc;
        this.indexer = indexer;
    }
    getConfig() {
        return this.svc.getMasked();
    }
    saveConfig(body) {
        return this.svc.saveConfig(body);
    }
    createKey(body) {
        return this.svc.createKey(body);
    }
    updateKey(id, body) {
        return this.svc.updateKey(id, body);
    }
    deleteKey(id) {
        return this.svc.deleteKey(id);
    }
    testKey(id) {
        return this.svc.testKey(id);
    }
    async generate(body) {
        const text = await this.svc.generate(body.prompt, body.system);
        return { text };
    }
    getSessions(req, projectId) {
        return this.svc.getSessions(req.user.id, projectId);
    }
    getSessionHistory(id) {
        return this.svc.getSessionHistory(id);
    }
    deleteSession(id, req) {
        return this.svc.deleteSession(id, req.user.id);
    }
    async chat(body, req) {
        const text = await this.svc.chat(body.sessionId, body.query, req.user.id, body.projectId);
        return { text };
    }
    async syncKnowledge(body) {
        return this.indexer.syncAllKnowledge(body?.projectId);
    }
    async uploadKnowledgeFile(file, category, projectId, req) {
        if (!file)
            throw new common_1.BadRequestException('No file uploaded');
        const uploadedBy = req?.user?.name || req?.user?.email || 'User';
        return this.indexer.uploadKnowledgeFile(file, category, projectId, uploadedBy);
    }
    async getKnowledgeDocuments(projectId, category, search) {
        return this.indexer.getKnowledgeDocuments(projectId, category, search);
    }
    async fetchFromLiaison(projectId) {
        return this.indexer.fetchFromLiaison(projectId);
    }
    async reindexKnowledgeDocument(id) {
        return this.indexer.reindexKnowledgeDocument(id);
    }
    async reindexAllFailed() {
        return this.indexer.reindexAllFailed();
    }
    async deleteKnowledgeDocument(id) {
        return this.indexer.deleteKnowledgeDocument(id);
    }
};
exports.AiController = AiController;
__decorate([
    (0, common_1.Get)('config'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.SUPER_ADMIN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AiController.prototype, "getConfig", null);
__decorate([
    (0, common_1.Post)('config'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.SUPER_ADMIN),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AiController.prototype, "saveConfig", null);
__decorate([
    (0, common_1.Post)('keys'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.SUPER_ADMIN),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AiController.prototype, "createKey", null);
__decorate([
    (0, common_1.Patch)('keys/:id'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.SUPER_ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AiController.prototype, "updateKey", null);
__decorate([
    (0, common_1.Delete)('keys/:id'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.SUPER_ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AiController.prototype, "deleteKey", null);
__decorate([
    (0, common_1.Post)('keys/:id/test'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.SUPER_ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AiController.prototype, "testKey", null);
__decorate([
    (0, common_1.Post)('generate'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "generate", null);
__decorate([
    (0, common_1.Get)('chat/sessions'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('projectId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AiController.prototype, "getSessions", null);
__decorate([
    (0, common_1.Get)('chat/sessions/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AiController.prototype, "getSessionHistory", null);
__decorate([
    (0, common_1.Delete)('chat/sessions/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AiController.prototype, "deleteSession", null);
__decorate([
    (0, common_1.Post)('chat'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "chat", null);
__decorate([
    (0, common_1.Post)('sync-knowledge'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "syncKnowledge", null);
__decorate([
    (0, common_1.Post)('knowledge/upload'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)('category')),
    __param(2, (0, common_1.Body)('projectId')),
    __param(3, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "uploadKnowledgeFile", null);
__decorate([
    (0, common_1.Get)('knowledge/documents'),
    __param(0, (0, common_1.Query)('projectId')),
    __param(1, (0, common_1.Query)('category')),
    __param(2, (0, common_1.Query)('search')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "getKnowledgeDocuments", null);
__decorate([
    (0, common_1.Post)('knowledge/fetch-liaison'),
    __param(0, (0, common_1.Body)('projectId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "fetchFromLiaison", null);
__decorate([
    (0, common_1.Post)('knowledge/documents/:id/reindex'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "reindexKnowledgeDocument", null);
__decorate([
    (0, common_1.Post)('knowledge/reindex-all'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AiController.prototype, "reindexAllFailed", null);
__decorate([
    (0, common_1.Delete)('knowledge/documents/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "deleteKnowledgeDocument", null);
exports.AiController = AiController = __decorate([
    (0, common_1.Controller)('ai'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, ai_access_guard_1.AiAccessGuard),
    __metadata("design:paramtypes", [ai_service_1.AiService,
        ai_indexer_service_1.AiIndexerService])
], AiController);
//# sourceMappingURL=ai.controller.js.map