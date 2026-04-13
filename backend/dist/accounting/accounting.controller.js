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
const accounting_service_1 = require("./accounting.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
let AccountingController = class AccountingController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    dashboard(pid) { return this.svc.dashboard(pid); }
    vendors(q) { return this.svc.listVendors({ projectId: q.projectId, category: q.category, search: q.search }); }
    createVendor(body) { return this.svc.createVendor(body); }
    vendorLedger(id) { return this.svc.vendorLedger(id); }
    vendor(id) { return this.svc.getVendor(id); }
    expenses(q) { return this.svc.listExpenses({ projectId: q.projectId, vendorId: q.vendorId, category: q.category, status: q.status, fromDate: q.fromDate, toDate: q.toDate }); }
    createExpense(body) { return this.svc.createExpense(body); }
    approveExpense(id, req) { return this.svc.approveExpense(id, req.user.id); }
    payExpense(id, body) { return this.svc.markExpensePaid(id, body); }
    transactions(q) { return this.svc.listTransactions({ projectId: q.projectId, vendorId: q.vendorId, fromDate: q.fromDate, toDate: q.toDate, type: q.type }); }
    addTxn(body) { return this.svc.addTransaction(body); }
    tds(q) { return this.svc.listTds({ projectId: q.projectId, quarter: q.quarter, fy: q.fy, status: q.status }); }
    depositTds(id, body) { return this.svc.depositTds(id, body); }
    listInvoices(q) {
        return this.svc.listInvoices({ projectId: q.projectId, status: q.status, limit: q.limit ? Number(q.limit) : undefined });
    }
    createInvoice(body, req) {
        return this.svc.createInvoice({ ...body, createdBy: req.user?.id });
    }
    getInvoice(id) { return this.svc.getInvoice(id); }
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
    (0, common_1.Post)('vendors'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "createVendor", null);
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
    (0, common_1.Post)('expenses'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "createExpense", null);
__decorate([
    (0, common_1.Patch)('expenses/:id/approve'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "approveExpense", null);
__decorate([
    (0, common_1.Patch)('expenses/:id/pay'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "payExpense", null);
__decorate([
    (0, common_1.Get)('transactions'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "transactions", null);
__decorate([
    (0, common_1.Post)('transactions'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "addTxn", null);
__decorate([
    (0, common_1.Get)('tds'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "tds", null);
__decorate([
    (0, common_1.Patch)('tds/:id/deposit'),
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
    (0, common_1.Post)('invoices'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "createInvoice", null);
__decorate([
    (0, common_1.Get)('invoices/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "getInvoice", null);
__decorate([
    (0, common_1.Patch)('invoices/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "updateInvoice", null);
__decorate([
    (0, common_1.Delete)('invoices/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "deleteInvoice", null);
exports.AccountingController = AccountingController = __decorate([
    (0, common_1.Controller)('accounting'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [accounting_service_1.AccountingService])
], AccountingController);
//# sourceMappingURL=accounting.controller.js.map