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
exports.EpcController = void 0;
const common_1 = require("@nestjs/common");
const epc_service_1 = require("./epc.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const ra_bill_entity_1 = require("./ra-bill.entity");
let EpcController = class EpcController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    milestones() { return this.svc.getPaymentMilestones(); }
    summary(pid) { return this.svc.boqSummary(pid); }
    seedBoq(body) { return this.svc.seedBoqItems(body.projectId, body.force ?? false); }
    listBoq(pid, cat) {
        return this.svc.listBoqItems(pid, cat);
    }
    createBoq(body) { return this.svc.createBoqItem(body); }
    updateBoq(id, body) { return this.svc.updateBoqItem(id, body); }
    measure(id, qty) {
        return this.svc.updateMeasuredQty(id, qty);
    }
    listRa(pid) { return this.svc.listRaBills(pid); }
    createRa(body) { return this.svc.createRaBill(body); }
    getRa(id) { return this.svc.getRaBill(id); }
    deleteRaBill(id) { return this.svc.deleteRaBill(id); }
    updateRaBill(id, body) { return this.svc.updateRaBill(id, body); }
    updateStatus(id, status, remarks) {
        return this.svc.updateRaBillStatus(id, status, remarks);
    }
    listMb(q) {
        return this.svc.listMeasurements({ projectId: q.projectId, boqItemId: q.boqItemId, raBillId: q.raBillId });
    }
    addMb(body) { return this.svc.addMeasurement(body); }
    saveQuotedRate(body) {
        return this.svc.saveQuotedRateByCategory(body.projectId, body.category, body.subCategory, body.quotedAmount);
    }
};
exports.EpcController = EpcController;
__decorate([
    (0, common_1.Get)('payment-milestones'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], EpcController.prototype, "milestones", null);
__decorate([
    (0, common_1.Get)('boq/summary'),
    __param(0, (0, common_1.Query)('projectId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], EpcController.prototype, "summary", null);
__decorate([
    (0, common_1.Post)('boq/seed'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], EpcController.prototype, "seedBoq", null);
__decorate([
    (0, common_1.Get)('boq'),
    __param(0, (0, common_1.Query)('projectId')),
    __param(1, (0, common_1.Query)('category')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], EpcController.prototype, "listBoq", null);
__decorate([
    (0, common_1.Post)('boq'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], EpcController.prototype, "createBoq", null);
__decorate([
    (0, common_1.Patch)('boq/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], EpcController.prototype, "updateBoq", null);
__decorate([
    (0, common_1.Patch)('boq/:id/measure'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('measuredQty')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", void 0)
], EpcController.prototype, "measure", null);
__decorate([
    (0, common_1.Get)('ra-bills'),
    __param(0, (0, common_1.Query)('projectId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], EpcController.prototype, "listRa", null);
__decorate([
    (0, common_1.Post)('ra-bills'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], EpcController.prototype, "createRa", null);
__decorate([
    (0, common_1.Get)('ra-bills/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], EpcController.prototype, "getRa", null);
__decorate([
    (0, common_1.Delete)('ra-bills/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], EpcController.prototype, "deleteRaBill", null);
__decorate([
    (0, common_1.Patch)('ra-bills/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], EpcController.prototype, "updateRaBill", null);
__decorate([
    (0, common_1.Patch)('ra-bills/:id/status'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('status')),
    __param(2, (0, common_1.Body)('remarks')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], EpcController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Get)('measurements'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], EpcController.prototype, "listMb", null);
__decorate([
    (0, common_1.Post)('measurements'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], EpcController.prototype, "addMb", null);
__decorate([
    (0, common_1.Patch)('boq/quoted-rate'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], EpcController.prototype, "saveQuotedRate", null);
exports.EpcController = EpcController = __decorate([
    (0, common_1.Controller)('epc'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [epc_service_1.EpcService])
], EpcController);
//# sourceMappingURL=epc.controller.js.map