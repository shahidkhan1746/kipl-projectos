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
exports.AccountingController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const accounting_service_1 = require("./accounting.service");
const storage_service_1 = require("../storage/storage.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const user_entity_1 = require("../users/user.entity");
const FIN = [user_entity_1.UserRole.SUPER_ADMIN, user_entity_1.UserRole.PROJECT_MANAGER, user_entity_1.UserRole.ACCOUNTS];
let AccountingController = class AccountingController {
    svc;
    storage;
    constructor(svc, storage) {
        this.svc = svc;
        this.storage = storage;
    }
    dashboard(pid) { return this.svc.dashboard(pid); }
    vendors(q) { return this.svc.listVendors({ projectId: q.projectId, category: q.category, search: q.search }); }
    vendorLedger(id) { return this.svc.vendorLedger(id); }
    vendor(id) { return this.svc.getVendor(id); }
    expenses(q) { return this.svc.listExpenses({ projectId: q.projectId, vendorId: q.vendorId, category: q.category, status: q.status, fromDate: q.fromDate, toDate: q.toDate }); }
    transactions(q) { return this.svc.listTransactions({ projectId: q.projectId, vendorId: q.vendorId, fromDate: q.fromDate, toDate: q.toDate, type: q.type }); }
    tds(q) { return this.svc.listTds({ projectId: q.projectId, quarter: q.quarter, fy: q.fy, status: q.status }); }
    upload(file) { return this.storage.upload(file, 'expenses'); }
    createVendor(body) { return this.svc.createVendor(body); }
    updateVendor(id, body) { return this.svc.updateVendor(id, body); }
    deleteVendor(id) { return this.svc.deleteVendor(id); }
    createExpense(body, req) { return this.svc.createExpense(body, req.user?.id); }
    updateExpense(id, body) { return this.svc.updateExpense(id, body); }
    deleteExpense(id) { return this.svc.deleteExpense(id); }
    approveExpense(id, req) { return this.svc.approveExpense(id, req.user.id); }
    payExpense(id, body) { return this.svc.markExpensePaid(id, body); }
    setItc(id, body) { return this.svc.setItcClaimed(id, !!body.claimed); }
    addTxn(body) { return this.svc.addTransaction(body); }
    depositTds(id, body) { return this.svc.depositTds(id, body); }
    listInvoices(q) { return this.svc.listInvoices({ projectId: q.projectId, status: q.status, limit: q.limit ? Number(q.limit) : undefined }); }
    getInvoice(id) { return this.svc.getInvoice(id); }
    createInvoice(body, req) { return this.svc.createInvoice({ ...body, createdBy: req.user?.id }); }
    updateInvoice(id, body) { return this.svc.updateInvoice(id, body); }
    deleteInvoice(id) { return this.svc.deleteInvoice(id); }
};
exports.AccountingController = AccountingController;
__decorate([
    (0, common_1.Get)('dashboard'),
    __param(0, (0, common_1.Query)('projectId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "dashboard", null);
__decorate([
    (0, common_1.Get)('vendors'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "vendors", null);
__decorate([
    (0, common_1.Get)('vendors/:id/ledger'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "vendorLedger", null);
__decorate([
    (0, common_1.Get)('vendors/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "vendor", null);
__decorate([
    (0, common_1.Get)('expenses'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "expenses", null);
__decorate([
    (0, common_1.Get)('transactions'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "transactions", null);
__decorate([
    (0, common_1.Get)('tds'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "tds", null);
__decorate([
    (0, common_1.Post)('upload'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(...FIN),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "upload", null);
__decorate([
    (0, common_1.Post)('vendors'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(...FIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "createVendor", null);
__decorate([
    (0, common_1.Patch)('vendors/:id'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(...FIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "updateVendor", null);
__decorate([
    (0, common_1.Delete)('vendors/:id'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(...FIN),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "deleteVendor", null);
__decorate([
    (0, common_1.Post)('expenses'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(...FIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "createExpense", null);
__decorate([
    (0, common_1.Patch)('expenses/:id'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(...FIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "updateExpense", null);
__decorate([
    (0, common_1.Delete)('expenses/:id'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(...FIN),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "deleteExpense", null);
__decorate([
    (0, common_1.Patch)('expenses/:id/approve'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(...FIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "approveExpense", null);
__decorate([
    (0, common_1.Patch)('expenses/:id/pay'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(...FIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "payExpense", null);
__decorate([
    (0, common_1.Patch)('expenses/:id/itc'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(...FIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "setItc", null);
__decorate([
    (0, common_1.Post)('transactions'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(...FIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "addTxn", null);
__decorate([
    (0, common_1.Patch)('tds/:id/deposit'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(...FIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "depositTds", null);
__decorate([
    (0, common_1.Get)('invoices'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "listInvoices", null);
__decorate([
    (0, common_1.Get)('invoices/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "getInvoice", null);
__decorate([
    (0, common_1.Post)('invoices'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(...FIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "createInvoice", null);
__decorate([
    (0, common_1.Patch)('invoices/:id'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(...FIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "updateInvoice", null);
__decorate([
    (0, common_1.Delete)('invoices/:id'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(...FIN),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "deleteInvoice", null);
exports.AccountingController = AccountingController = __decorate([
    (0, common_1.Controller)('accounting'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [accounting_service_1.AccountingService, storage_service_1.StorageService])
], AccountingController);
//# sourceMappingURL=accounting.controller.js.map