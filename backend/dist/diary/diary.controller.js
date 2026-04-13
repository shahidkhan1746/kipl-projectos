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
exports.DiaryController = void 0;
const common_1 = require("@nestjs/common");
const diary_service_1 = require("./diary.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
let DiaryController = class DiaryController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    dashboard(pid) { return this.svc.dashboard(pid); }
    list(q) {
        return this.svc.list({ projectId: q.projectId, fromDate: q.fromDate, toDate: q.toDate, status: q.status, eotOnly: q.eotOnly === 'true' });
    }
    byDate(pid, date) {
        return this.svc.findByDate(pid, date);
    }
    getOne(id) { return this.svc.findOne(id); }
    create(body, req) {
        return this.svc.create({ ...body, submittedBy: req.user?.name ?? req.user?.id });
    }
    update(id, body) { return this.svc.update(id, body); }
    submit(id) { return this.svc.submit(id); }
    approve(id, req) { return this.svc.approve(id, req.user?.id); }
};
exports.DiaryController = DiaryController;
__decorate([
    (0, common_1.Get)('dashboard'),
    __param(0, (0, common_1.Query)('projectId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], DiaryController.prototype, "dashboard", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], DiaryController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('by-date'),
    __param(0, (0, common_1.Query)('projectId')),
    __param(1, (0, common_1.Query)('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], DiaryController.prototype, "byDate", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], DiaryController.prototype, "getOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], DiaryController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], DiaryController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)(':id/submit'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], DiaryController.prototype, "submit", null);
__decorate([
    (0, common_1.Patch)(':id/approve'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], DiaryController.prototype, "approve", null);
exports.DiaryController = DiaryController = __decorate([
    (0, common_1.Controller)('diary'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [diary_service_1.DiaryService])
], DiaryController);
//# sourceMappingURL=diary.controller.js.map