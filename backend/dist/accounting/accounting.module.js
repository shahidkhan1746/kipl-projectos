"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountingModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const vendor_entity_1 = require("./vendor.entity");
const expense_entity_1 = require("./expense.entity");
const transaction_entity_1 = require("./transaction.entity");
const tds_entry_entity_1 = require("./tds-entry.entity");
const invoice_entity_1 = require("./invoice.entity");
const accounting_service_1 = require("./accounting.service");
const accounting_controller_1 = require("./accounting.controller");
const storage_module_1 = require("../storage/storage.module");
let AccountingModule = class AccountingModule {
};
exports.AccountingModule = AccountingModule;
exports.AccountingModule = AccountingModule = __decorate([
    (0, common_1.Module)({ imports: [typeorm_1.TypeOrmModule.forFeature([vendor_entity_1.Vendor, expense_entity_1.Expense, transaction_entity_1.Transaction, tds_entry_entity_1.TdsEntry, invoice_entity_1.Invoice]), storage_module_1.StorageModule], providers: [accounting_service_1.AccountingService], controllers: [accounting_controller_1.AccountingController], exports: [accounting_service_1.AccountingService] })
], AccountingModule);
//# sourceMappingURL=accounting.module.js.map