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
exports.OmController = void 0;
const common_1 = require("@nestjs/common");
const om_service_1 = require("./om.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
let OmController = class OmController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    dashboard(pid) { return this.svc.dashboard(pid); }
    listLogs(q) { return this.svc.listLogs({ projectId: q.projectId, from: q.from, to: q.to }); }
    createLog(body) { return this.svc.createLog(body); }
    updateLog(id, body) { return this.svc.updateLog(id, body); }
    deleteLog(id) { return this.svc.deleteLog(id); }
    listEvents(q) { return this.svc.listEvents({ projectId: q.projectId, type: q.type, status: q.status }); }
    createEvent(body) { return this.svc.createEvent(body); }
    updateEvent(id, body) { return this.svc.updateEvent(id, body); }
    deleteEvent(id) { return this.svc.deleteEvent(id); }
};
exports.OmController = OmController;
__decorate([
    (0, common_1.Get)('dashboard'),
    __param(0, (0, common_1.Query)('projectId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], OmController.prototype, "dashboard", null);
__decorate([
    (0, common_1.Get)('logs'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], OmController.prototype, "listLogs", null);
__decorate([
    (0, common_1.Post)('logs'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], OmController.prototype, "createLog", null);
__decorate([
    (0, common_1.Patch)('logs/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], OmController.prototype, "updateLog", null);
__decorate([
    (0, common_1.Delete)('logs/:id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], OmController.prototype, "deleteLog", null);
__decorate([
    (0, common_1.Get)('events'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], OmController.prototype, "listEvents", null);
__decorate([
    (0, common_1.Post)('events'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], OmController.prototype, "createEvent", null);
__decorate([
    (0, common_1.Patch)('events/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], OmController.prototype, "updateEvent", null);
__decorate([
    (0, common_1.Delete)('events/:id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], OmController.prototype, "deleteEvent", null);
exports.OmController = OmController = __decorate([
    (0, common_1.Controller)('om'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [om_service_1.OmService])
], OmController);
//# sourceMappingURL=om.controller.js.map