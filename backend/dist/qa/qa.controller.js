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
exports.QaController = void 0;
const common_1 = require("@nestjs/common");
const qa_service_1 = require("./qa.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
let QaController = class QaController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    dashboard(pid) { return this.svc.dashboard(pid); }
    list(pid, cat) { return this.svc.listChecklists(pid, cat); }
    seed(pid) { return this.svc.seedChecklists(pid); }
    create(body) { return this.svc.createChecklist(body); }
    getOne(id) { return this.svc.getChecklist(id); }
    inspections(q) { return this.svc.listInspections({ projectId: q.projectId, workItem: q.workItem, result: q.result, fromDate: q.fromDate, toDate: q.toDate }); }
    createInsp(body) { return this.svc.createInspection(body); }
    getInsp(id) { return this.svc.getInspection(id); }
    updateInsp(id, body) { return this.svc.updateInspection(id, body); }
    ncrs(q) { return this.svc.listNcrs({ projectId: q.projectId, status: q.status, severity: q.severity }); }
    createNcr(body) { return this.svc.createNcr(body); }
    closeNcr(id, body, req) {
        return this.svc.closeNcr(id, { ...body, closedBy: req.user?.id });
    }
};
exports.QaController = QaController;
__decorate([
    (0, common_1.Get)('dashboard'),
    __param(0, (0, common_1.Query)('projectId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], QaController.prototype, "dashboard", null);
__decorate([
    (0, common_1.Get)('checklists'),
    __param(0, (0, common_1.Query)('projectId')),
    __param(1, (0, common_1.Query)('category')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], QaController.prototype, "list", null);
__decorate([
    (0, common_1.Post)('checklists/seed'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)('projectId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], QaController.prototype, "seed", null);
__decorate([
    (0, common_1.Post)('checklists'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], QaController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('checklists/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], QaController.prototype, "getOne", null);
__decorate([
    (0, common_1.Get)('inspections'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], QaController.prototype, "inspections", null);
__decorate([
    (0, common_1.Post)('inspections'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], QaController.prototype, "createInsp", null);
__decorate([
    (0, common_1.Get)('inspections/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], QaController.prototype, "getInsp", null);
__decorate([
    (0, common_1.Patch)('inspections/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], QaController.prototype, "updateInsp", null);
__decorate([
    (0, common_1.Get)('ncrs'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], QaController.prototype, "ncrs", null);
__decorate([
    (0, common_1.Post)('ncrs'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], QaController.prototype, "createNcr", null);
__decorate([
    (0, common_1.Patch)('ncrs/:id/close'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], QaController.prototype, "closeNcr", null);
exports.QaController = QaController = __decorate([
    (0, common_1.Controller)('qa'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [qa_service_1.QaService])
], QaController);
//# sourceMappingURL=qa.controller.js.map