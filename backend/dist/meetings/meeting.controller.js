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
exports.MeetingController = void 0;
const common_1 = require("@nestjs/common");
const meeting_service_1 = require("./meeting.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
let MeetingController = class MeetingController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    dashboard(pid) { return this.svc.dashboard(pid); }
    list(q) { return this.svc.list({ projectId: q.projectId, type: q.type, status: q.status, fromDate: q.fromDate, toDate: q.toDate }); }
    create(body, req) {
        if (!body.projectId)
            throw new common_1.BadRequestException('Project ID is required');
        if (!body.title?.trim())
            throw new common_1.BadRequestException('Meeting title is required');
        if (!body.date)
            throw new common_1.BadRequestException('Meeting date is required');
        return this.svc.create({ ...body, minutedBy: body.minutedBy || req.user?.name });
    }
    getOne(id) { return this.svc.findOne(id); }
    update(id, body) { return this.svc.update(id, body); }
    circulate(id) { return this.svc.circulate(id); }
    confirm(id) { return this.svc.confirm(id); }
    updateAction(id, idx, body) {
        return this.svc.updateActionItem(id, parseInt(idx), body);
    }
};
exports.MeetingController = MeetingController;
__decorate([
    (0, common_1.Get)('dashboard'),
    __param(0, (0, common_1.Query)('projectId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MeetingController.prototype, "dashboard", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], MeetingController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], MeetingController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MeetingController.prototype, "getOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], MeetingController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)(':id/circulate'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MeetingController.prototype, "circulate", null);
__decorate([
    (0, common_1.Patch)(':id/confirm'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MeetingController.prototype, "confirm", null);
__decorate([
    (0, common_1.Patch)(':id/actions/:idx'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('idx')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], MeetingController.prototype, "updateAction", null);
exports.MeetingController = MeetingController = __decorate([
    (0, common_1.Controller)('meetings'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [meeting_service_1.MeetingService])
], MeetingController);
//# sourceMappingURL=meeting.controller.js.map