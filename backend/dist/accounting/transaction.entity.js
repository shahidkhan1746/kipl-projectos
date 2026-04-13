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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Transaction = exports.TxnType = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("../shared/entities/base.entity");
var TxnType;
(function (TxnType) {
    TxnType["RECEIPT"] = "receipt";
    TxnType["PAYMENT"] = "payment";
    TxnType["JOURNAL"] = "journal";
})(TxnType || (exports.TxnType = TxnType = {}));
let Transaction = class Transaction extends base_entity_1.BaseEntity {
    projectId;
    date;
    type;
    description;
    refNo;
    refType;
    refId;
    vendorId;
    debit;
    credit;
    balance;
    paymentMode;
    bankRef;
    narration;
};
exports.Transaction = Transaction;
__decorate([
    (0, typeorm_1.Column)({ name: 'project_id' }),
    __metadata("design:type", String)
], Transaction.prototype, "projectId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date' }),
    __metadata("design:type", String)
], Transaction.prototype, "date", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: TxnType }),
    __metadata("design:type", String)
], Transaction.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], Transaction.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ref_no', nullable: true }),
    __metadata("design:type", String)
], Transaction.prototype, "refNo", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ref_type', nullable: true }),
    __metadata("design:type", String)
], Transaction.prototype, "refType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ref_id', nullable: true }),
    __metadata("design:type", String)
], Transaction.prototype, "refId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'vendor_id', nullable: true }),
    __metadata("design:type", String)
], Transaction.prototype, "vendorId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'debit', type: 'decimal', precision: 15, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], Transaction.prototype, "debit", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'credit', type: 'decimal', precision: 15, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], Transaction.prototype, "credit", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'balance', type: 'decimal', precision: 15, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], Transaction.prototype, "balance", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'payment_mode', nullable: true }),
    __metadata("design:type", String)
], Transaction.prototype, "paymentMode", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'bank_ref', nullable: true }),
    __metadata("design:type", String)
], Transaction.prototype, "bankRef", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Transaction.prototype, "narration", void 0);
exports.Transaction = Transaction = __decorate([
    (0, typeorm_1.Entity)('transactions')
], Transaction);
//# sourceMappingURL=transaction.entity.js.map